import { Router } from "express";
import BookingController from "./booking.controller";
import { authenticate } from "../../middlewares/auth.middlewares";

const bookingRouter = new BookingController();

const router: Router = Router();

router.use(authenticate);

router.post("/", bookingRouter.createBooking);
router.get("/", bookingRouter.listMyBookings);
router.get("/:id", bookingRouter.getBooking);
router.delete("/:id", bookingRouter.cancelBooking);

export default router;
