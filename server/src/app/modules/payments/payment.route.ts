import { Router } from "express";
import { paymentController } from "./payment.controller";
import { authenticate } from "../../middlewares/auth.middlewares";

const router: Router = Router();

// authenticated — start a payment for a booking
router.post("/initiate", authenticate, paymentController.initiate);

// public provider callbacks (browser redirects, verified server-side)
router.get("/khalti/callback", paymentController.khaltiCallback);
router.get("/esewa/callback", paymentController.esewaCallback);

export default router;
