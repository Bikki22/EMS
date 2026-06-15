import type { Request, Response } from "express";
import { EventService } from "./event.services";
import {
  createEventSchema,
  updateEventSchema,
  eventFiltersSchema,
  publishEventSchema,
} from "./event.validation";
import type { OrganizerRequest } from "./event.types";

const eventService = new EventService();

class EventController {
  public async handleCreateEvent(req: Request, res: Response) {
    const validationData = await createEventSchema.safeParseAsync(req.body);
    if (!validationData.success) {
      return res.status(400).json({
        message: "Validation failed",
        error: validationData.error.issues,
      });
    }

    const { organizer } = req as OrganizerRequest;

    try {
      const event = await eventService.createEvent(
        organizer._id,
        validationData.data,
      );
      return res.status(201).json({
        message: "Event created successfully",
        data: { event },
      });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }

  public async handleGetEvents(req: Request, res: Response) {
    const filterEvent = await eventFiltersSchema.safeParseAsync(req.query);
    if (!filterEvent.success) {
      return res.status(400).json({
        message: "Invalid filters",
        error: filterEvent.error.issues,
      });
    }

    const data = await eventService.getEvents(filterEvent.data);
    return res.status(200).json({ data });
  }

  public async handleGetEventBySlug(req: Request, res: Response) {
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

  public async handleGetEventById(req: Request, res: Response) {
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

  public async handleUpdateEvent(req: Request, res: Response) {
    const validateUpdateSchema = await updateEventSchema.safeParseAsync(
      req.body,
    );
    if (!validateUpdateSchema.success) {
      return res.status(400).json({
        message: "Validation failed",
        error: validateUpdateSchema.error.issues,
      });
    }

    const { organizer } = req as OrganizerRequest;

    try {
      const { id } = req.params;
      if (!id || typeof id !== "string") {
        return res.status(400).json({ message: "Invalid or missing event ID" });
      }
      const event = await eventService.updateEvent(
        id,
        organizer._id,
        validateUpdateSchema.data,
      );

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      return res.status(200).json({
        message: "Event updated successfully",
        data: { event },
      });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }

  public async handleUpdateEventStatus(req: Request, res: Response) {
    const result = await publishEventSchema.safeParseAsync(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        error: result.error.issues,
      });
    }

    const { organizer } = req as OrganizerRequest;

    try {
      const { id } = req.params;
      if (!id || typeof id !== "string") {
        return res.status(400).json({ message: "Invalid or missing event ID" });
      }
      const event = await eventService.updateEventStatus(
        id,
        organizer._id,
        result.data.status,
      );

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      return res.status(200).json({
        message: `Event ${result.data.status} successfully`,
        data: { event },
      });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }

  public async handleDeleteEvent(req: Request, res: Response) {
    const { organizer } = req as OrganizerRequest;

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
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }

  public async handleGetMyEvents(req: Request, res: Response) {
    const { organizer } = req as OrganizerRequest;
    const pageQuery = req.query.page;
    const limitQuery = req.query.limit;
    const page = (typeof pageQuery === "string" ? Number(pageQuery) : NaN) || 1;
    const limit =
      (typeof limitQuery === "string" ? Number(limitQuery) : NaN) || 10;

    const data = await eventService.getMyEvents(organizer._id, page, limit);
    return res.status(200).json({ data });
  }
}

export default EventController;
