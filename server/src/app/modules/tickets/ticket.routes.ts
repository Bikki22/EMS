import { Router } from "express";
import { ticketController } from "./ticket.controller";
import { authenticate } from "../../middlewares/auth.middlewares";
import { authorize } from "../../middlewares/authorize";

const router: Router = Router();

router.use(authenticate);

// user routes
router.get("/me", ticketController.listMyTickets);
router.get("/:id", ticketController.getTicket);
router.post("/:id/transfer", ticketController.transferTicket);

// org staff routes
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
