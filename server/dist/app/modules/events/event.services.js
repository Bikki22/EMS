"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventService = void 0;
const event_model_1 = require("./event.model");
const organizer_model_1 = require("./organizer.model");
class EventService {
    async getOrganizerByUserId(userId) {
        return organizer_model_1.Organizer.findOne({ userId });
    }
    async createEvent(organizerId, data) {
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
        const event = await event_model_1.Event.create(payload);
        return event;
    }
    async getEvents(filters) {
        const { category, city, country, locationType, startFrom, startTo, search, status, organizerId, page = 1, limit = 10, sortBy = "startsAt", sortOrder = "asc", } = filters;
        const query = {};
        if (category)
            query.category = category;
        if (locationType)
            query["location.type"] = locationType;
        if (city)
            query["location.city"] = new RegExp(city, "i");
        if (country)
            query["location.country"] = new RegExp(country, "i");
        if (status)
            query.status = status;
        if (organizerId)
            query.organizer = organizerId;
        if (startFrom || startTo) {
            query.startsAt = {};
            if (startFrom)
                query.startsAt.$gte = new Date(startFrom);
            if (startTo)
                query.startsAt.$lte = new Date(startTo);
        }
        if (search) {
            query.$text = { $search: search };
        }
        const skip = (page - 1) * limit;
        const sort = {
            [sortBy]: sortOrder === "asc" ? 1 : -1,
        };
        const [events, total] = await Promise.all([
            event_model_1.Event.find(query)
                .populate("organizer", "name logoUrl isVerified")
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            event_model_1.Event.countDocuments(query),
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
    async getEventById(eventId) {
        return event_model_1.Event.findById(eventId)
            .populate("organizer", "name logoUrl isVerified website")
            .lean();
    }
    async getEventBySlug(slug) {
        return event_model_1.Event.findOne({ slug })
            .populate("organizer", "name logoUrl isVerified website")
            .lean();
    }
    async updateEvent(eventId, organizerId, data) {
        const event = await event_model_1.Event.findOne({
            _id: eventId,
            organizer: organizerId,
        });
        if (!event)
            return null;
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
    async updateEventStatus(eventId, organizerId, status) {
        const event = await event_model_1.Event.findOne({
            _id: eventId,
            organizer: organizerId,
        });
        if (!event)
            return null;
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
    async deleteEvent(eventId, organizerId) {
        const event = await event_model_1.Event.findOne({
            _id: eventId,
            organizer: organizerId,
        });
        if (!event)
            return null;
        if (event.status === "published") {
            throw new Error("Cannot delete a published event. Cancel it first.");
        }
        await event.deleteOne();
        return true;
    }
    async getMyEvents(organizerId, page, limit) {
        return this.getEvents({ organizerId, page, limit });
    }
}
exports.EventService = EventService;
//# sourceMappingURL=event.services.js.map