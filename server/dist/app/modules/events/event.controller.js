"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const event_services_1 = require("./event.services");
const event_validation_1 = require("./event.validation");
const eventService = new event_services_1.EventService();
class EventController {
    async handleCreateEvent(req, res) {
        const validationData = await event_validation_1.createEventSchema.safeParseAsync(req.body);
        if (!validationData.success) {
            return res.status(400).json({
                message: "Validation failed",
                error: validationData.error.issues,
            });
        }
        const { organizer } = req;
        try {
            const event = await eventService.createEvent(organizer._id, validationData.data);
            return res.status(201).json({
                message: "Event created successfully",
                data: { event },
            });
        }
        catch (err) {
            return res.status(400).json({ message: err.message });
        }
    }
    async handleGetEvents(req, res) {
        const filterEvent = await event_validation_1.eventFiltersSchema.safeParseAsync(req.query);
        if (!filterEvent.success) {
            return res.status(400).json({
                message: "Invalid filters",
                error: filterEvent.error.issues,
            });
        }
        const data = await eventService.getEvents(filterEvent.data);
        return res.status(200).json({ data });
    }
    async handleGetEventBySlug(req, res) {
        const { slug } = req.params;
        if (!slug || typeof slug !== "string") {
            return res.status(400).json({ message: "Invalid or missing event slug" });
        }
        const event = await eventService.getEventBySlug(slug);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }
        return res.status(200).json({ data: { event } });
    }
    async handleGetEventById(req, res) {
        const { id } = req.params;
        if (!id || typeof id !== "string") {
            return res.status(400).json({ message: "Invalid or missing event ID" });
        }
        const event = await eventService.getEventById(id);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }
        return res.status(200).json({ data: { event } });
    }
    async handleUpdateEvent(req, res) {
        const validateUpdateSchema = await event_validation_1.updateEventSchema.safeParseAsync(req.body);
        if (!validateUpdateSchema.success) {
            return res.status(400).json({
                message: "Validation failed",
                error: validateUpdateSchema.error.issues,
            });
        }
        const { organizer } = req;
        try {
            const { id } = req.params;
            if (!id || typeof id !== "string") {
                return res.status(400).json({ message: "Invalid or missing event ID" });
            }
            const event = await eventService.updateEvent(id, organizer._id, validateUpdateSchema.data);
            if (!event) {
                return res.status(404).json({ message: "Event not found" });
            }
            return res.status(200).json({
                message: "Event updated successfully",
                data: { event },
            });
        }
        catch (err) {
            return res.status(400).json({ message: err.message });
        }
    }
    async handleUpdateEventStatus(req, res) {
        const result = await event_validation_1.publishEventSchema.safeParseAsync(req.body);
        if (!result.success) {
            return res.status(400).json({
                message: "Validation failed",
                error: result.error.issues,
            });
        }
        const { organizer } = req;
        try {
            const { id } = req.params;
            if (!id || typeof id !== "string") {
                return res.status(400).json({ message: "Invalid or missing event ID" });
            }
            const event = await eventService.updateEventStatus(id, organizer._id, result.data.status);
            if (!event) {
                return res.status(404).json({ message: "Event not found" });
            }
            return res.status(200).json({
                message: `Event ${result.data.status} successfully`,
                data: { event },
            });
        }
        catch (err) {
            return res.status(400).json({ message: err.message });
        }
    }
    async handleDeleteEvent(req, res) {
        const { organizer } = req;
        try {
            const { id } = req.params;
            if (!id || typeof id !== "string") {
                return res.status(400).json({ message: "Invalid or missing event ID" });
            }
            const result = await eventService.deleteEvent(id, organizer._id);
            if (!result) {
                return res.status(404).json({ message: "Event not found" });
            }
            return res.status(200).json({ message: "Event deleted successfully" });
        }
        catch (err) {
            return res.status(400).json({ message: err.message });
        }
    }
    async handleGetMyEvents(req, res) {
        const { organizer } = req;
        const pageQuery = req.query.page;
        const limitQuery = req.query.limit;
        const page = (typeof pageQuery === "string" ? Number(pageQuery) : NaN) || 1;
        const limit = (typeof limitQuery === "string" ? Number(limitQuery) : NaN) || 10;
        const data = await eventService.getMyEvents(organizer._id, page, limit);
        return res.status(200).json({ data });
    }
}
exports.default = EventController;
//# sourceMappingURL=event.controller.js.map