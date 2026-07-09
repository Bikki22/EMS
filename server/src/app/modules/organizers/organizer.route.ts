import { Router } from "express";
import { organizerController } from "./organizer.controller";
import { authenticate } from "../../middlewares/auth.middlewares";

const router: Router = Router();

router.use(authenticate);

router.post("/", organizerController.createOrganizer);
router.get("/me", organizerController.getMyOrganizer);
router.patch("/me", organizerController.updateMyOrganizer);

export default router;
