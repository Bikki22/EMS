import { Event } from "./event.model";
import type {
  CreateEventData,
  UpdateEventData,
  EventFilters,
} from "./event.types";
import { UpdateEventInput } from "./event.validation";
import { Organizer } from "./organizer.model";

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

  public async getEvents(filters: EventFilters) {
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
    if (city) query["location.city"] = new RegExp(city, "i");
    if (country) query["location.country"] = new RegExp(country, "i");
    if (status) query.status = status;
    if (organizerId) query.organizer = organizerId;

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

  public async getEventById(eventId: string) {
    return Event.findById(eventId)
      .populate("organizer", "name logoUrl isVerified website")
      .lean();
  }

  public async getEventBySlug(slug: string) {
    return Event.findOne({ slug })
      .populate("organizer", "name logoUrl isVerified website")
      .lean();
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

    if (data.ticketTypes) {
      data.ticketTypes = data.ticketTypes.map((t) => ({
        ...t,
        availableQuantity: t.totalQuantity,
      }));
    }

    Object.assign(event, data);
    await event.save();

    return event;
  }

  public async updateEventStatus(
    eventId: string,
    organizerId: string,
    status: "published" | "cancelled",
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

    await event.deleteOne();
    return true;
  }

  public async getMyEvents(organizerId: string, page: number, limit: number) {
    return this.getEvents({ organizerId, page, limit });
  }
}
