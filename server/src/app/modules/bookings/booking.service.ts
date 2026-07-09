import { Types } from "mongoose";
import { randomBytes } from "node:crypto";
import { Event } from "../events/event.model";
import { Booking, type IBooking } from "./booking.model";
import { Ticket } from "../tickets/tickets.model";
import { ApiError } from "../../utils/ApiError";

export interface SeatItem {
  ticketTypeId: string;
  quantity: number;
}

const toObjectId = (id: string | Types.ObjectId): Types.ObjectId =>
  id instanceof Types.ObjectId ? id : new Types.ObjectId(String(id));

export class BookingService {
  /**
   * Atomically reserve `quantity` seats of a single ticket type.
   * Decrements availableQuantity only if enough seats remain, so concurrent
   * bookings cannot oversell. Returns false when seats are unavailable.
   */
  public async reserveSeats(
    eventId: string,
    ticketTypeId: string,
    quantity: number,
  ): Promise<boolean> {
    const updated = await Event.findOneAndUpdate(
      { _id: eventId },
      {
        $inc: {
          "ticketTypes.$[elem].quantitySold": quantity,
          "ticketTypes.$[elem].availableQuantity": -quantity,
        },
      },
      {
        arrayFilters: [
          {
            "elem._id": toObjectId(ticketTypeId),
            "elem.availableQuantity": { $gte: quantity },
          },
        ],
        new: true,
      },
    );

    return !!updated;
  }

  /** Return reserved seats back to inventory. */
  public async releaseSeats(
    eventId: string | Types.ObjectId,
    items: SeatItem[],
  ): Promise<void> {
    for (const item of items) {
      await Event.findOneAndUpdate(
        { _id: eventId, "ticketTypes._id": item.ticketTypeId },
        {
          $inc: {
            "ticketTypes.$.quantitySold": -item.quantity,
            "ticketTypes.$.availableQuantity": item.quantity,
          },
        },
      );
    }
  }

  /** Create one Ticket document per seat in the booking. */
  public async issueTickets(booking: IBooking): Promise<number> {
    const docs = booking.items.flatMap((item) =>
      Array.from({ length: item.quantity }, () => ({
        booking: booking._id,
        event: booking.event,
        user: booking.user,
        ticketTypeId: toObjectId(item.ticketTypeId),
        ticketName: item.name,
        qrToken: randomBytes(24).toString("hex"),
        status: "active" as const,
      })),
    );

    if (docs.length > 0) {
      await Ticket.insertMany(docs);
    }

    return docs.length;
  }

  /**
   * Confirm a pending booking, issue its tickets and bump event booking
   * totals. Idempotent: calling it on an already-confirmed booking is a no-op.
   * Used by the free-event path and by successful payment verification.
   */
  public async confirmBooking(
    bookingId: string | Types.ObjectId,
    opts: { paymentIntentId?: string } = {},
  ): Promise<IBooking> {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }

    if (booking.status === "Confirmed") {
      return booking; // idempotent — payment webhooks may fire twice
    }

    if (booking.status !== "Pending") {
      throw new ApiError(
        400,
        `Cannot confirm a booking with status "${booking.status}"`,
      );
    }

    booking.status = "Confirmed";
    booking.confirmedAt = new Date();
    booking.expiresAt = undefined;
    if (opts.paymentIntentId) {
      booking.paymentIntentId = opts.paymentIntentId;
    }
    await booking.save();

    await this.issueTickets(booking);

    const totalQty = booking.items.reduce((s, i) => s + i.quantity, 0);
    await Event.findByIdAndUpdate(booking.event, {
      $inc: { totalBookings: totalQty },
    });

    return booking;
  }

  /**
   * Release seats and expire any pending bookings whose hold window lapsed.
   * Returns the number of bookings expired. Called by the expiry sweeper.
   */
  public async expirePendingBookings(): Promise<number> {
    const expired = await Booking.find({
      status: "Pending",
      expiresAt: { $lte: new Date() },
    });

    for (const booking of expired) {
      await this.releaseSeats(
        booking.event,
        booking.items.map((i) => ({
          ticketTypeId: i.ticketTypeId,
          quantity: i.quantity,
        })),
      );
      booking.status = "Expired";
      booking.expiresAt = undefined;
      await booking.save();
    }

    return expired.length;
  }
}

export const bookingService = new BookingService();
