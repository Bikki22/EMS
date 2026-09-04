import { Router } from "express";
import { ticketController } from "./ticket.controller";
import { authenticate } from "../../middlewares/auth.middlewares";
import { authorize } from "../../middlewares/authorize";

const router: Router = Router();

router.use(authenticate);

// user routes
// "/me" is declared before "/:id" so it isn't swallowed as a ticket id.
router.get("/me", ticketController.listMyTickets);
router.get("/:id", ticketController.getTicket);
router.post("/:id/transfer", ticketController.transferTicket);

// Org staff routes.
//
// `authorize` is only the coarse gate: it proves the caller holds the role,
// not that the event in question is theirs. Anyone can self-promote to
// org_owner by creating an organizer profile, so each handler additionally
// calls `ticketService.assertEventAccess` to confirm they actually run the
// event. Do not add an endpoint here that skips that check.
router.post(
  "/check-in",
  authorize("org_owner", "admin"),
  ticketController.checkInTicket,
);
router.get(
  "/event/:eventId",
  authorize("org_owner", "admin"),
  ticketController.listEventTickets,
);
router.get(
  "/event/:eventId/stats",
  authorize("org_owner", "admin"),
  ticketController.getEventCheckInStats,
);

export default router;
