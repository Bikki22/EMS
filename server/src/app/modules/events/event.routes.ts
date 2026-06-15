import { Router } from "express";
import EventController from "./event.controller";
import { authenticate } from "../../middlewares/auth.middlewares";
import { requireOrganizer } from "../../middlewares/event.middlewares";

const router: Router = Router();
const eventController = new EventController();

// public routes
router.get("/", eventController.handleGetEvents);
router.get("/:slug", eventController.handleGetEventBySlug);
router.get("/id/:id", eventController.handleGetEventById);

// organizer only routes
router.use(authenticate, requireOrganizer as any);

router.post("/", eventController.handleCreateEvent);
router.get("/my/events", eventController.handleGetMyEvents);
router.put("/:id", eventController.handleUpdateEvent);
router.patch("/:id/status", eventController.handleUpdateEventStatus);
router.delete("/:id", eventController.handleDeleteEvent);

export default router;
