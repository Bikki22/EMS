import { Router } from "express";
import AuthenticationController from "./auth.controller";
import { authenticate } from "../../middlewares/auth.middlewares";

const router: Router = Router();
const authController = new AuthenticationController();

router.post("/signup", authController.handleSignup.bind(authController));
router.post("/login", authController.handleLogin.bind(authController));
router.post(
  "/verify-email",
  authController.handleVerifyEmail.bind(authController),
);
router.post("/refresh", authController.handleRefresh.bind(authController));
router.post(
  "/forgot-password",
  authController.handleForgotPassword.bind(authController),
);
router.post(
  "/reset-password",
  authController.handleResetPassword.bind(authController),
);
router.get("/me", authenticate, authController.handleMe.bind(authController));
router.post(
  "/logout",
  authenticate,
  authController.handleLogout.bind(authController),
);

export default router;
