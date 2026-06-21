import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/AsyncHandler";
import { cancelBookingSchema, createBookingSchema } from "./booking.validation";
import { AuthRequest } from "../../types/express";
import { Event } from "../events/event.model";
import { Booking } from "./booking.model";
import { ApiResponse } from "../../utils/ApiResponse";
import { randomBytes } from "node:crypto";
import { Ticket } from "../tickets/tickets.model";

const BOOKING_EXPIRY_MINUTES = 15;
const CANCELLATION_WINDOW_HOURS = 24;

class BookingController {
  public createBooking = asyncHandler(async (req, res) => {
    const result = await createBookingSchema.safeParseAsync(req.body);
    if (!result.success) {
      throw new ApiError(
        400,
        "validation failed",
        result.error.issues.map((i) => i.message),
      );
    }

    const { eventId, items } = result.data;

    const userId = req as AuthRequest;

    if (userId) {
      throw new ApiError(401, "unauthorized");
    }

    // fetch event

    const event = await Event.findById(eventId);
    if (!event) {
      throw new ApiError(404, "Event not found");
    }

    // validate event is bookable
    if (event.status !== "published") {
      throw new ApiError(400, "This event is not open for booking");
    }

    if (event.startsAt > new Date()) {
      throw new ApiError(400, "This event has already started");
    }

    // validate each ticketType + build booking item

    const bookingItems: {
      ticketTypeId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[] = [];

    let totalAmount: number = 0;

    for (const item of items) {
      const ticketType = event.ticketTypes.find(
        (tt) => tt._id?.toString() === item.ticketTypeId,
      );

      if (!ticketType) {
        throw new ApiError(404, `Ticket type ${item.ticketTypeId} not found`);
      }

      if (!ticketType._id) {
        throw new ApiError(404, `Ticket type ${item.ticketTypeId} not found`);
      }

      if (!ticketType.isActive) {
        throw new ApiError(
          400,
          `tick type ${ticketType.name} is not available`,
        );
      }

      // check sale window
      const now = new Date();

      if (ticketType.salesStartAt && now < ticketType.salesStartAt) {
        throw new ApiError(
          400,
          `Ticket sales ${ticketType.name} have't satrted yet`,
        );
      }

      if (ticketType.salesEndAt && now > ticketType.salesEndAt) {
        throw new ApiError(
          400,
          `Ticket sales for ${ticketType.name} have ended`,
        );
      }

      //   check max per booking

      if (item.quantity > ticketType.maxPerBooking) {
        throw new ApiError(
          400,
          `maximum ${ticketType.maxPerBooking} tickets allowed booking for ${ticketType.name}`,
        );
      }

      //   check availability

      if (item.quantity > ticketType.availableQuantity) {
        throw new ApiError(
          400,
          `Only ${ticketType.availableQuantity} "${ticketType.name}" tickets remaining`,
        );
      }

      const subtotal = ticketType.price * item.quantity;
      totalAmount += subtotal;

      bookingItems.push({
        ticketTypeId: ticketType._id,
        name: ticketType.name,
        quantity: item.quantity,
        unitPrice: ticketType.price,
        subtotal,
      });

      for (const item of bookingItems) {
        const updated = await Event.findOneAndUpdate(
          {
            _id: eventId,
            ticketTypes: {
              $elemMatch: {
                _id: item.ticketTypeId,
                $expr: {
                  $lte: [
                    { $add: ["$$this.quantitySold", item.quantity] },
                    "$$this.quantity",
                  ],
                },
              },
            },
          },
          {
            $inc: { "ticketTypes.$[elem].quantitySold": item.quantity },
          },
          {
            arrayFilters: [{ "elem._id": item.ticketTypeId }],
            new: true,
          },
        );

        // fallback simpler check if $expr in elemMatch isn't supported in your mongo version:
        if (!updated) {
          await this.rollbackSeatLocks(
            eventId,
            bookingItems.slice(0, bookingItems.indexOf(item)),
          );
          throw new ApiError(
            409,
            `Seats for "${item.name}" were just taken. Please try again.`,
          );
        }
      }

      // 5. create booking record (status: pending, expires in 15 min)
      const expiresAt = new Date(
        Date.now() + BOOKING_EXPIRY_MINUTES * 60 * 1000,
      );

      const booking = await Booking.create({
        user: userId,
        event: event._id,
        organization: event.organizer,
        items: bookingItems,
        totalAmount,
        currency: "usd",
        status: "Pending",
        expiresAt,
      });

      // 6. handle free events — auto-confirm immediately
      if (totalAmount === 0) {
        booking.status = "Confirmed";
        booking.confirmedAt = new Date();
        booking.expiresAt = undefined;
        await booking.save();

        await this.issueTicket(booking);

        await Event.findByIdAndUpdate(eventId, {
          $inc: {
            totalBookings: bookingItems.reduce((s, i) => s + i.quantity, 0),
          },
        });

        return res
          .status(201)
          .json(
            new ApiResponse(
              201,
              { booking, requiresPayment: false },
              "Booking confirmed",
            ),
          );
      }
    }
  });

  private async rollbackSeatLocks(
    eventId: string,
    items: { ticketTypeId: string; quantity: number }[],
  ) {
    for (const item of items) {
      await Event.findOneAndUpdate(
        { _id: eventId, "ticketTypes._id": item.ticketTypeId },
        { $inc: { "ticketTypes.$.quantitySold": -item.quantity } },
      );
    }
  }

  // ─── Helper — issue tickets after confirmation ────────────────
  private async issueTicket(booking: InstanceType<typeof Booking>) {
    const tickestToCreate = [];

    for (const item of booking.items) {
      for (let i = 0; i < item.quantity; i++) {
        const qrToken = randomBytes(24).toString("hex");

        tickestToCreate.push({
          booking: booking._id,
          event: booking.event,
          user: booking.user,
          ticketTypeId: item.ticketTypeId,
          ticketName: item.name,
          qrToken,
          status: "active",
        });
      }
    }
    // await Ticket.insertMany(tickestToCreate);
  }

  public getBooking = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req as AuthRequest;

    const booking = await Booking.findById(id).populate("event", "user").lean();

    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }

    // only owner or admin can view
    // if (booking.user.toString() !== userId && req.user?.role !== "admin") {
    //   throw new ApiError(403, "You don't have access to this booking");
    // }
    res.status(200).json(new ApiResponse(200, booking, "Booking fetched"));
  });

  public listMyBookings = asyncHandler(async (req, res) => {
    const userId = (req as AuthRequest).user._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string | undefined;

    const filter: Record<string, unknown> = { user: userId };
    if (status) filter.status = status;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("event", "title slug startsAt bannerUrl")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Booking.countDocuments(filter),
    ]);
    res.status(200).json(
      new ApiResponse(
        200,
        {
          data: bookings,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        "Bookings fetched",
      ),
    );
  });

  public cancelBooking = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = (req as AuthRequest).user?._id;
    const result = cancelBookingSchema.safeParse(req.body);

    if (!result.success) {
      throw new ApiError(
        400,
        "Validation failed",
        result.error.issues.map((i) => i.message),
      );
    }

    const booking = await Booking.findById(id).populate("event");
    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }

    if (booking.user.toString() !== userId) {
      throw new ApiError(403, "You can only cancel your own bookings");
    }

    if (booking.status === "Cancelled") {
      throw new ApiError(400, "Booking is already cancelled");
    }

    if (booking.status === "Expired") {
      throw new ApiError(400, "This booking has expired");
    }

    const event = booking.event as any;

    // check cancellation window
    const hoursUntilEvent =
      (event.startsAt.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilEvent < CANCELLATION_WINDOW_HOURS) {
      throw new ApiError(
        400,
        `Bookings can only be cancelled at least ${CANCELLATION_WINDOW_HOURS} hours before the event`,
      );
    }

    const wasConfirmed = booking.status === "Confirmed";

    // release seats back
    for (const item of booking.items) {
      await Event.findOneAndUpdate(
        { _id: event._id, "ticketTypes._id": item.ticketTypeId },
        { $inc: { "ticketTypes.$.quantitySold": -item.quantity } },
      );
    }

    if (wasConfirmed) {
      await Event.findByIdAndUpdate(event._id, {
        $inc: {
          totalBookings: -booking.items.reduce((s, i) => s + i.quantity, 0),
        },
      });

      // cancel tickets
      await Ticket.updateMany(
        { booking: booking._id },
        { $set: { status: "cancelled" } },
      );
    }

    // refund if paid

    booking.status = "Cancelled";
    booking.cancelledAt = new Date();
    booking.cancelReason = result.data.reason;
    await booking.save();

    res
      .status(200)
      .json(new ApiResponse(200, booking, "Booking cancelled successfully"));
  });
}

export default BookingController;
