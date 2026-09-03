import { Event, type ITicketType } from "./event.model";
import type {
  CreateEventData,
  UpdateEventData,
  EventFilters,
} from "./event.types";
import { UpdateEventInput, TicketTypeInput } from "./event.validation";
import { Organizer } from "./organizer.model";
import { Booking } from "../bookings/booking.model";

// Filter values are interpolated into a RegExp for case-insensitive matching.
// Unescaped, a stray "(" from a query string throws and a crafted value is a
// ReDoS against the database.
const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Statuses that mean "this booking still holds seats on the event".
const LIVE_BOOKING_STATUSES = ["Pending", "Confirmed"] as const;

export class EventService {
  public async getOrganizerByUserId(userId: string) {
    return Organizer.findOne({ userId });
  }

  public async createEvent(organizerId: string, data: CreateEventData) {
    const ticketTypes = data.ticketTypes.map((t) => ({
      ...t,
      availableQuantity: t.totalQuantity,
    }));

    const { tags, ...eventData } = data;
    const payload = {
      ...eventData,
      ...(tags ? { tags } : {}),
      organizer: organizerId,
      ticketTypes,
    };

    const event = await Event.create(payload as any);

    return event;
  }

  /**
   * `includeUnpublished` is opt-in and only set by the organizer-scoped
   * listing. The public browse endpoint must never surface drafts, so a
   * caller-supplied `status` filter is ignored there.
   */
  public async getEvents(
    filters: EventFilters,
    opts: { includeUnpublished?: boolean } = {},
  ) {
    const {
      category,
      city,
      country,
      locationType,
      startFrom,
      startTo,
      search,
      status,
      organizerId,
      page = 1,
      limit = 10,
      sortBy = "startsAt",
      sortOrder = "asc",
    } = filters;

    const query: Record<string, any> = {};

    if (category) query.category = category;
    if (locationType) query["location.type"] = locationType;
    if (city) query["location.city"] = new RegExp(escapeRegex(city), "i");
    if (country) {
      query["location.country"] = new RegExp(escapeRegex(country), "i");
    }
    if (organizerId) query.organizer = organizerId;

    if (opts.includeUnpublished) {
      if (status) query.status = status;
    } else {
      query.status = "published";
    }

    if (startFrom || startTo) {
      query.startsAt = {};
      if (startFrom) query.startsAt.$gte = new Date(startFrom);
      if (startTo) query.startsAt.$lte = new Date(startTo);
    }

    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    const [events, total] = await Promise.all([
      Event.find(query)
        .populate("organizer", "name logoUrl isVerified")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments(query),
    ]);

    return {
      events,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * A draft or cancelled event is only visible to the organizer that owns it.
   * `viewerOrganizerId` is the viewing user's organizer profile when they have
   * one; everyone else sees published events only.
   */
  private isVisibleTo(
    event: { status: string; organizer: unknown },
    viewerOrganizerId?: string | undefined,
  ): boolean {
    if (event.status === "published") return true;
    if (!viewerOrganizerId) return false;

    const owner =
      event.organizer && typeof event.organizer === "object"
        ? (event.organizer as { _id?: unknown })._id
        : event.organizer;

    return String(owner) === String(viewerOrganizerId);
  }

  public async getEventById(eventId: string, viewerOrganizerId?: string) {
    const event = await Event.findById(eventId)
      .populate("organizer", "name logoUrl isVerified website")
      .lean();

    if (!event || !this.isVisibleTo(event, viewerOrganizerId)) return null;

    return event;
  }

  public async getEventBySlug(slug: string, viewerOrganizerId?: string) {
    const event = await Event.findOne({ slug })
      .populate("organizer", "name logoUrl isVerified website")
      .lean();

    if (!event || !this.isVisibleTo(event, viewerOrganizerId)) return null;

    return event;
  }

  public async updateEvent(
    eventId: string,
    organizerId: string,
    data: UpdateEventInput,
  ) {
    const event = await Event.findOne({
      _id: eventId,
      organizer: organizerId,
    });

    if (!event) return null;

    if (event.status === "cancelled") {
      throw new Error("Cannot update a cancelled event");
    }

    const { ticketTypes, ...rest } = data;
    Object.assign(event, rest);

    if (ticketTypes) {
      event.ticketTypes = this.mergeTicketTypes(
        event.ticketTypes,
        ticketTypes,
      ) as ITicketType[];
    }

    await event.save();

    return event;
  }

  /**
   * Fold an incoming ticket-type array into the stored one.
   *
   * Rebuilding the array from the request wholesale used to reset
   * `quantitySold` to 0 and mint fresh subdocument _ids, which both oversold
   * the event and orphaned every existing booking's `ticketTypeId`. Entries
   * carrying an `_id` are therefore matched to the stored ticket type and keep
   * its identity and sold count; only genuinely new entries start empty.
   */
  private mergeTicketTypes(
    existing: ITicketType[],
    incoming: TicketTypeInput[],
  ) {
    const stored = new Map(existing.map((t) => [String(t._id), t]));
    const kept = new Set<string>();

    const merged = incoming.map((t) => {
      const prior = t._id ? stored.get(String(t._id)) : undefined;

      if (!prior) {
        return { ...t, quantitySold: 0, availableQuantity: t.totalQuantity };
      }

      kept.add(String(prior._id));
      const sold = prior.quantitySold ?? 0;

      if (t.totalQuantity < sold) {
        throw new Error(
          `Cannot reduce "${prior.name}" to ${t.totalQuantity} tickets: ${sold} are already booked`,
        );
      }

      return {
        ...t,
        _id: prior._id,
        quantitySold: sold,
        availableQuantity: t.totalQuantity - sold,
      };
    });

    // Dropping a ticket type that has sold seats would strand those bookings
    // the same way re-issuing its _id did.
    for (const [id, prior] of stored) {
      if (!kept.has(id) && (prior.quantitySold ?? 0) > 0) {
        throw new Error(
          `Cannot remove ticket type "${prior.name}": ${prior.quantitySold} tickets are already booked`,
        );
      }
    }

    return merged;
  }

  /** Bookings that still hold seats on this event. */
  private async countLiveBookings(eventId: string): Promise<number> {
    return Booking.countDocuments({
      event: eventId,
      status: { $in: LIVE_BOOKING_STATUSES },
    });
  }

  public async updateEventStatus(
    eventId: string,
    organizerId: string,
    status: "draft" | "published" | "cancelled",
  ) {
    const event = await Event.findOne({
      _id: eventId,
      organizer: organizerId,
    });

    if (!event) return null;

    if (event.status === "cancelled") {
      throw new Error("Cannot change status of a cancelled event");
    }

    if (status === "published" && event.ticketTypes.length === 0) {
      throw new Error("Cannot publish event without ticket types");
    }

    // Unpublishing hides an event people have already booked onto, so it is
    // only allowed while nothing is holding seats.
    if (status === "draft" && event.status === "published") {
      const live = await this.countLiveBookings(eventId);
      if (live > 0) {
        throw new Error(
          `Cannot unpublish an event with ${live} active booking(s). Cancel it instead.`,
        );
      }
    }

    event.status = status;
    await event.save();

    return event;
  }

  public async deleteEvent(eventId: string, organizerId: string) {
    const event = await Event.findOne({
      _id: eventId,
      organizer: organizerId,
    });

    if (!event) return null;

    if (event.status === "published") {
      throw new Error("Cannot delete a published event. Cancel it first.");
    }

    // A cancelled event could still be deleted out from under its bookings,
    // which left them in the user's list with a null event.
    const live = await this.countLiveBookings(eventId);
    if (live > 0) {
      throw new Error(
        `Cannot delete an event with ${live} active booking(s). Cancel those bookings first.`,
      );
    }

    await event.deleteOne();
    return true;
  }

  public async getMyEvents(organizerId: string, page: number, limit: number) {
    return this.getEvents(
      { organizerId, page, limit },
      { includeUnpublished: true },
    );
  }
}
