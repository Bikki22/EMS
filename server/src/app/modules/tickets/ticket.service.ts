import mongoose, { Types } from "mongoose";
import { ApiError } from "../../utils/ApiError";
import { Event } from "../events/event.model";
import { Organizer } from "../organizers/organizer.model";
import { User } from "../auth/auth.model";
import { Ticket, type ITicket, type TicketStatus } from "./tickets.model";
import { sendTicketTransferEmail } from "../../utils/email";

// How far either side of an event check-in is allowed to happen.
const CHECK_IN_BUFFER_MS = 2 * 60 * 60 * 1000;

export interface Caller {
  _id: string;
  email: string;
  roles: string;
}

// The slice of an event the ticket flows actually need.
interface EventContext {
  _id: Types.ObjectId;
  title: string;
  startsAt: Date;
  endsAt: Date;
  organizer: Types.ObjectId;
}

const EVENT_FIELDS = "title startsAt endsAt organizer";

export class TicketService {
  /**
   * Authority to act on an event's tickets. `authorize("org_owner", "admin")`
   * on the route only proves the caller holds the role — it says nothing about
   * *which* events are theirs, and every org_owner could otherwise read any
   * event's attendee list or check in against any event. Admins pass
   * unconditionally; an org_owner has to own the event via their organizer
   * profile.
   *
   * Returns the event so callers don't fetch it twice.
   */
  public async assertEventAccess(
    eventId: string | Types.ObjectId,
    caller: Caller,
  ): Promise<EventContext> {
    const event = await Event.findById(eventId)
      .select(EVENT_FIELDS)
      .lean<EventContext | null>();

    if (!event) {
      throw new ApiError(404, "Event not found");
    }

    if (caller.roles === "admin") {
      return event;
    }

    const organizer = await Organizer.findOne({ userId: caller._id })
      .select("_id")
      .lean<{ _id: Types.ObjectId } | null>();

    if (!organizer) {
      throw new ApiError(
        403,
        "You must have an organizer profile to perform this action",
      );
    }

    if (String(event.organizer) !== String(organizer._id)) {
      throw new ApiError(403, "You don't manage this event");
    }

    return event;
  }

  public async getOwnedTicket(ticketId: string, userId: string) {
    const ticket = await Ticket.findById(ticketId)
      .select("+qrToken")
      .populate("event", "title slug startsAt endsAt location bannerUrl")
      .lean();

    if (!ticket) {
      throw new ApiError(404, "Ticket not found");
    }

    if (ticket.user.toString() !== userId) {
      throw new ApiError(403, "You don't have access to this ticket");
    }

    return ticket;
  }

  public async listUserTickets(
    userId: string,
    filters: { eventId?: string | undefined; status?: TicketStatus | undefined },
  ) {
    const filter: Record<string, unknown> = { user: userId };
    if (filters.eventId) filter.event = filters.eventId;
    if (filters.status) filter.status = filters.status;

    return Ticket.find(filter)
      .populate("event", "title slug startsAt bannerUrl location")
      .sort({ createdAt: -1 })
      .lean();
  }

  public async listEventTickets(
    eventId: string,
    status: TicketStatus | undefined,
  ) {
    const filter: Record<string, unknown> = { event: eventId };
    if (status) filter.status = status;

    return Ticket.find(filter)
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 })
      .lean();
  }

  public async getEventStats(eventId: string) {
    const [total, checkedIn, cancelled] = await Promise.all([
      Ticket.countDocuments({ event: eventId }),
      Ticket.countDocuments({ event: eventId, status: "used" }),
      Ticket.countDocuments({ event: eventId, status: "cancelled" }),
    ]);

    // Every status is one of the three, so what is left is exactly the
    // still-valid, not-yet-scanned tickets.
    const remaining = total - checkedIn - cancelled;

    return {
      total,
      checkedIn,
      remaining,
      cancelled,
      // Share of sellable tickets that actually turned up. Cancelled tickets
      // were never going to be scanned, so counting them in the denominator
      // understated the rate.
      checkInRate:
        total - cancelled > 0
          ? Math.round((checkedIn / (total - cancelled)) * 100)
          : 0,
    };
  }

  /**
   * Scan a QR token and burn the ticket.
   *
   * The status transition is a single conditional update rather than a
   * read-check-save. Two scanners hitting the same code at once both passed
   * the old in-memory `status === "used"` check and both wrote, double
   * admitting one attendee. Only one request can now match `status: "active"`.
   */
  public async checkIn(qrToken: string, caller: Caller) {
    const ticket = await Ticket.findOne({ qrToken })
      .select("+qrToken")
      .lean<ITicket | null>();

    if (!ticket) {
      throw new ApiError(404, "Invalid QR code — ticket not found");
    }

    // Resolve authority before revealing anything about the ticket, so a
    // foreign organizer can't probe another event's tickets by status.
    const event = await this.assertEventAccess(ticket.event, caller);

    const now = new Date();
    if (now.getTime() < new Date(event.startsAt).getTime() - CHECK_IN_BUFFER_MS) {
      throw new ApiError(400, "Check-in hasn't opened yet for this event");
    }
    if (now.getTime() > new Date(event.endsAt).getTime() + CHECK_IN_BUFFER_MS) {
      throw new ApiError(400, "This event has already ended");
    }

    const updated = await Ticket.findOneAndUpdate(
      { _id: ticket._id, status: "active" },
      {
        $set: {
          status: "used",
          checkedInAt: now,
          checkedInBy: new mongoose.Types.ObjectId(caller._id),
        },
      },
      { returnDocument: "after" },
    );

    if (!updated) {
      // The conditional update matched nothing: someone else won the race, or
      // the ticket was never scannable. Re-read for the precise reason.
      const current = await Ticket.findById(ticket._id)
        .select("status checkedInAt")
        .lean<Pick<ITicket, "status" | "checkedInAt"> | null>();

      if (current?.status === "cancelled") {
        throw new ApiError(400, "This ticket has been cancelled");
      }
      if (current?.status === "used") {
        throw new ApiError(
          409,
          `Ticket already checked in at ${current.checkedInAt?.toLocaleString()}`,
        );
      }
      throw new ApiError(409, "Ticket could not be checked in");
    }

    return {
      ticketId: updated._id,
      ticketName: updated.ticketName,
      checkedInAt: updated.checkedInAt,
      eventTitle: event.title,
    };
  }

  /**
   * Hand a ticket to another registered user. The ticket is reassigned in
   * place and stays "active" — the recipient scans the same QR code — while
   * `originalOwner` / `transferredFrom` / `transferCount` keep the trail.
   */
  public async transfer(
    ticketId: string,
    recipientEmail: string,
    callerId: string,
  ) {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new ApiError(404, "Ticket not found");
    }

    if (ticket.user.toString() !== callerId) {
      throw new ApiError(403, "You can only transfer your own tickets");
    }

    if (ticket.status !== "active") {
      throw new ApiError(
        400,
        `Cannot transfer a ticket with status "${ticket.status}"`,
      );
    }

    const event = await Event.findById(ticket.event)
      .select(EVENT_FIELDS)
      .lean<EventContext | null>();

    if (!event) {
      throw new ApiError(404, "The event for this ticket no longer exists");
    }

    if (new Date(event.startsAt) <= new Date()) {
      throw new ApiError(
        400,
        "Cannot transfer tickets after the event has started",
      );
    }

    const recipient = await User.findOne({
      email: recipientEmail.toLowerCase(),
    }).select("_id email firstName");

    if (!recipient) {
      throw new ApiError(404, "Recipient is not registered on the platform");
    }

    if (recipient._id.toString() === callerId) {
      throw new ApiError(400, "You cannot transfer a ticket to yourself");
    }

    const previousOwner = ticket.user;

    // Set once, on the first transfer, so a chain still names the buyer.
    if (!ticket.originalOwner) {
      ticket.originalOwner = previousOwner;
    }
    ticket.transferredFrom = previousOwner;
    ticket.transferredAt = new Date();
    ticket.transferCount += 1;
    ticket.user = recipient._id;
    await ticket.save();

    // The recipient has no other way to learn a ticket is waiting for them.
    // A mail failure must not roll back a completed transfer.
    try {
      await sendTicketTransferEmail(recipient.email, {
        eventTitle: event.title,
        ticketName: ticket.ticketName,
        startsAt: event.startsAt,
      });
    } catch (err) {
      console.error(
        `transfer: ticket ${String(ticket._id)} moved to ${recipient.email} but the notification email failed`,
        err,
      );
    }

    return ticket;
  }
}

export const ticketService = new TicketService();
