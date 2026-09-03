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
   *
   * The availability guard has to live in the query filter, not in
   * arrayFilters. arrayFilters only chooses which array element the $inc
   * applies to — it has no say in whether the document matches. With the guard
   * there, a request for more seats than remain matched the event anyway,
   * performed a no-op update, and still came back as a document, so this
   * returned true and the caller booked seats it never held.
   */
  public async reserveSeats(
    eventId: string,
    ticketTypeId: string,
    quantity: number,
  ): Promise<boolean> {
    const updated = await Event.findOneAndUpdate(
      {
        _id: eventId,
        ticketTypes: {
          $elemMatch: {
            _id: toObjectId(ticketTypeId),
            availableQuantity: { $gte: quantity },
          },
        },
      },
      {
        $inc: {
          "ticketTypes.$.quantitySold": quantity,
          "ticketTypes.$.availableQuantity": -quantity,
        },
      },
      { new: true },
    );

    return !!updated;
  }

  /**
   * Return reserved seats back to inventory.
   *
   * Only releases seats that are actually held: without the quantitySold floor
   * a double release drives quantitySold negative and pushes availableQuantity
   * past totalQuantity. The schema's `min: 0` does not catch that, because
   * $inc through findOneAndUpdate skips validators.
   */
  public async releaseSeats(
    eventId: string | Types.ObjectId,
    items: SeatItem[],
  ): Promise<void> {
    for (const item of items) {
      const updated = await Event.findOneAndUpdate(
        {
          _id: eventId,
          ticketTypes: {
            $elemMatch: {
              _id: toObjectId(item.ticketTypeId),
              quantitySold: { $gte: item.quantity },
            },
          },
        },
        {
          $inc: {
            "ticketTypes.$.quantitySold": -item.quantity,
            "ticketTypes.$.availableQuantity": item.quantity,
          },
        },
      );

      // Nothing matched: those seats were never held. Releasing them would
      // invent inventory, so skip it — but it means a caller released twice,
      // which is worth seeing in the logs.
      if (!updated) {
        console.warn(
          `releaseSeats: no held seats to release for ticket type ${item.ticketTypeId} (qty ${item.quantity}) on event ${String(eventId)}`,
        );
      }
    }
  }

  /**
   * Create one Ticket document per seat in the booking. Skips bookings that
   * already have tickets so a retry after a crash mid-confirm cannot issue a
   * second set.
   */
  public async issueTickets(booking: IBooking): Promise<number> {
    const existing = await Ticket.countDocuments({ booking: booking._id });
    if (existing > 0) {
      return 0;
    }

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
   *
   * The Pending check is part of the update filter rather than a read followed
   * by a save. Payment providers retry callbacks, and two of them arriving at
   * once both passed a read-then-write check — issuing two sets of tickets for
   * one booking and counting it twice against the event. Only one writer can
   * match `status: "Pending"`; every other caller falls through to the re-read
   * below and returns the already-confirmed booking.
   */
  public async confirmBooking(
    bookingId: string | Types.ObjectId,
    opts: { paymentIntentId?: string } = {},
  ): Promise<IBooking> {
    const fields: Record<string, unknown> = {
      status: "Confirmed",
      confirmedAt: new Date(),
    };
    if (opts.paymentIntentId) {
      fields.paymentIntentId = opts.paymentIntentId;
    }

    const booking = await Booking.findOneAndUpdate(
      { _id: bookingId, status: "Pending" },
      { $set: fields, $unset: { expiresAt: 1 } },
      { new: true },
    );

    if (!booking) {
      const existing = await Booking.findById(bookingId);

      if (!existing) {
        throw new ApiError(404, "Booking not found");
      }

      if (existing.status === "Confirmed") {
        return existing; // idempotent — payment webhooks may fire twice
      }

      throw new ApiError(
        400,
        `Cannot confirm a booking with status "${existing.status}"`,
      );
    }

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
