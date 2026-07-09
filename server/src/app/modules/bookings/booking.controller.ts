import type { RequestHandler } from "express";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/AsyncHandler";
import { cancelBookingSchema, createBookingSchema } from "./booking.validation";
import { AuthRequest } from "../../types/express";
import { Event } from "../events/event.model";
import { Booking } from "./booking.model";
import { ApiResponse } from "../../utils/ApiResponse";
import { Ticket } from "../tickets/tickets.model";
import { bookingService, type SeatItem } from "./booking.service";

const BOOKING_EXPIRY_MINUTES = 15;
const CANCELLATION_WINDOW_HOURS = 24;

interface BookingItemLine {
  ticketTypeId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

class BookingController {
  // ─── POST /api/v1/bookings ─────────────────────────────────
  public createBooking: RequestHandler = asyncHandler(async (req, res) => {
    const result = await createBookingSchema.safeParseAsync(req.body);
    if (!result.success) {
      throw new ApiError(
        400,
        "Validation failed",
        result.error.issues.map((i) => i.message),
      );
    }

    const { eventId, items } = result.data;
    const userId = (req as AuthRequest).user?._id;
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const event = await Event.findById(eventId);
    if (!event) {
      throw new ApiError(404, "Event not found");
    }

    if (event.status !== "published") {
      throw new ApiError(400, "This event is not open for booking");
    }

    // event must still be in the future
    if (event.startsAt.getTime() <= Date.now()) {
      throw new ApiError(400, "This event has already started");
    }

    // 1. Validate every requested item and compute pricing (no mutation yet).
    const now = new Date();
    const bookingItems: BookingItemLine[] = [];
    let totalAmount = 0;
    let currency = "NPR";

    for (const item of items) {
      const ticketType = event.ticketTypes.find(
        (tt) => tt._id?.toString() === item.ticketTypeId,
      );

      if (!ticketType || !ticketType._id) {
        throw new ApiError(404, `Ticket type ${item.ticketTypeId} not found`);
      }

      if (!ticketType.isActive) {
        throw new ApiError(
          400,
          `Ticket type "${ticketType.name}" is not available`,
        );
      }

      if (ticketType.salesStartAt && now < ticketType.salesStartAt) {
        throw new ApiError(
          400,
          `Ticket sales for "${ticketType.name}" haven't started yet`,
        );
      }

      if (ticketType.salesEndAt && now > ticketType.salesEndAt) {
        throw new ApiError(
          400,
          `Ticket sales for "${ticketType.name}" have ended`,
        );
      }

      if (item.quantity > ticketType.maxPerBooking) {
        throw new ApiError(
          400,
          `A maximum of ${ticketType.maxPerBooking} "${ticketType.name}" tickets is allowed per booking`,
        );
      }

      if (item.quantity > ticketType.availableQuantity) {
        throw new ApiError(
          400,
          `Only ${ticketType.availableQuantity} "${ticketType.name}" tickets remaining`,
        );
      }

      const subtotal = ticketType.price * item.quantity;
      totalAmount += subtotal;
      currency = ticketType.currency || currency;

      bookingItems.push({
        ticketTypeId: ticketType._id.toString(),
        name: ticketType.name,
        quantity: item.quantity,
        unitPrice: ticketType.price,
        subtotal,
      });
    }

    // 2. Atomically reserve seats. Roll back everything already held if any
    //    ticket type just sold out under a concurrent booking.
    const reserved: SeatItem[] = [];
    for (const line of bookingItems) {
      const ok = await bookingService.reserveSeats(
        eventId,
        line.ticketTypeId,
        line.quantity,
      );

      if (!ok) {
        await bookingService.releaseSeats(eventId, reserved);
        throw new ApiError(
          409,
          `Seats for "${line.name}" were just taken. Please try again.`,
        );
      }

      reserved.push({
        ticketTypeId: line.ticketTypeId,
        quantity: line.quantity,
      });
    }

    // 3. Create the pending booking with a hold window.
    const expiresAt = new Date(
      Date.now() + BOOKING_EXPIRY_MINUTES * 60 * 1000,
    );

    let booking;
    try {
      booking = await Booking.create({
        user: userId,
        event: event._id,
        organization: event.organizer,
        items: bookingItems,
        totalAmount,
        currency,
        status: "Pending",
        expiresAt,
      });
    } catch (err) {
      // creation failed after seats were held — release them
      await bookingService.releaseSeats(eventId, reserved);
      throw err;
    }

    // 4. Free events confirm immediately; paid events await payment.
    if (totalAmount === 0) {
      const confirmed = await bookingService.confirmBooking(booking._id);
      return res
        .status(201)
        .json(
          new ApiResponse(
            201,
            { booking: confirmed, requiresPayment: false },
            "Booking confirmed",
          ),
        );
    }

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          booking,
          requiresPayment: true,
          expiresAt,
          next: "POST /api/v1/payments/initiate with { bookingId, provider }",
        },
        "Booking reserved. Complete payment to confirm.",
      ),
    );
  });

  // ─── GET /api/v1/bookings/:id ──────────────────────────────
  public getBooking: RequestHandler = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const authReq = req as AuthRequest;
    const userId = authReq.user?._id;

    const booking = await Booking.findById(id)
      .populate("event", "title slug startsAt bannerUrl")
      .lean();

    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }

    // only the owner or an admin may view a booking
    if (
      booking.user.toString() !== userId &&
      authReq.user?.roles !== "admin"
    ) {
      throw new ApiError(403, "You don't have access to this booking");
    }

    res.status(200).json(new ApiResponse(200, booking, "Booking fetched"));
  });

  // ─── GET /api/v1/bookings ──────────────────────────────────
  public listMyBookings: RequestHandler = asyncHandler(async (req, res) => {
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

  // ─── DELETE /api/v1/bookings/:id ───────────────────────────
  public cancelBooking: RequestHandler = asyncHandler(async (req, res) => {
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

    const event = booking.event as unknown as {
      _id: unknown;
      startsAt: Date;
    };

    const hoursUntilEvent =
      (new Date(event.startsAt).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilEvent < CANCELLATION_WINDOW_HOURS) {
      throw new ApiError(
        400,
        `Bookings can only be cancelled at least ${CANCELLATION_WINDOW_HOURS} hours before the event`,
      );
    }

    const wasConfirmed = booking.status === "Confirmed";

    // release seats back to inventory
    await bookingService.releaseSeats(
      booking.event as never,
      booking.items.map((i) => ({
        ticketTypeId: i.ticketTypeId,
        quantity: i.quantity,
      })),
    );

    if (wasConfirmed) {
      const totalQty = booking.items.reduce((s, i) => s + i.quantity, 0);
      await Event.findByIdAndUpdate(event._id, {
        $inc: { totalBookings: -totalQty },
      });

      await Ticket.updateMany(
        { booking: booking._id },
        { $set: { status: "cancelled" } },
      );
    }

    // NOTE: refunds for paid bookings are handled out of band via the payment
    // provider; mark the booking cancelled here.
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
