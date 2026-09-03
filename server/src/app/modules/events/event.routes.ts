import { Router } from "express";
import EventController from "./event.controller";
import {
  authenticate,
  optionalAuthenticate,
} from "../../middlewares/auth.middlewares";
import { requireOrganizer } from "../../middlewares/event.middlewares";

const router: Router = Router();
const eventController = new EventController();

// Public routes. optionalAuthenticate does not reject anonymous callers — it
// just identifies the ones that are signed in, so an organizer can still see
// their own unpublished events here.
router.get("/", eventController.handleGetEvents);
router.get("/:slug", optionalAuthenticate, eventController.handleGetEventBySlug);
router.get("/id/:id", optionalAuthenticate, eventController.handleGetEventById);

// organizer only routes
router.use(authenticate, requireOrganizer as any);

router.post("/", eventController.handleCreateEvent);
router.get("/my/events", eventController.handleGetMyEvents);
router.put("/:id", eventController.handleUpdateEvent);
router.patch("/:id/status", eventController.handleUpdateEventStatus);
router.delete("/:id", eventController.handleDeleteEvent);

export default router;
