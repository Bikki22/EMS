"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const event_controller_1 = __importDefault(require("./event.controller"));
const auth_middlewares_1 = require("../../middlewares/auth.middlewares");
const event_middlewares_1 = require("../../middlewares/event.middlewares");
const router = (0, express_1.Router)();
const eventController = new event_controller_1.default();
// Public routes. optionalAuthenticate does not reject anonymous callers — it
// just identifies the ones that are signed in, so an organizer can still see
// their own unpublished events here.
router.get("/", eventController.handleGetEvents);
router.get("/:slug", auth_middlewares_1.optionalAuthenticate, eventController.handleGetEventBySlug);
router.get("/id/:id", auth_middlewares_1.optionalAuthenticate, eventController.handleGetEventById);
// organizer only routes
router.use(auth_middlewares_1.authenticate, event_middlewares_1.requireOrganizer);
router.post("/", eventController.handleCreateEvent);
router.get("/my/events", eventController.handleGetMyEvents);
router.put("/:id", eventController.handleUpdateEvent);
router.patch("/:id/status", eventController.handleUpdateEventStatus);
router.delete("/:id", eventController.handleDeleteEvent);
exports.default = router;
//# sourceMappingURL=event.routes.js.map