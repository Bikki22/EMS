import { Router } from "express";
import AuthenticationController from "./auth.controller";
import { authenticate } from "../../middlewares/auth.middlewares";
import { rateLimit, byBodyEmail } from "../../middlewares/rateLimit.middleware";

const router: Router = Router();
const authController = new AuthenticationController();

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// Credential endpoints get two ceilings: a broad per-IP one, and a tighter
// per-account one so an attacker rotating addresses from a single IP can't buy
// themselves a fresh budget for every account they target.
const loginIpLimit = rateLimit({
  windowMs: 15 * MINUTE,
  max: 20,
  message: "Too many login attempts. Please try again in a few minutes.",
});
const loginAccountLimit = rateLimit({
  windowMs: 15 * MINUTE,
  max: 5,
  key: byBodyEmail,
  message: "Too many login attempts for this account. Please try again later.",
});

const forgotPasswordIpLimit = rateLimit({
  windowMs: HOUR,
  max: 5,
  message: "Too many password reset requests. Please try again later.",
});
const forgotPasswordAccountLimit = rateLimit({
  windowMs: HOUR,
  max: 3,
  key: byBodyEmail,
  message: "Too many password reset requests. Please try again later.",
});

const resendVerificationLimit = rateLimit({
  windowMs: HOUR,
  max: 3,
  key: byBodyEmail,
  message: "Too many verification emails requested. Please try again later.",
});

const signupLimit = rateLimit({ windowMs: HOUR, max: 10 });
const tokenGuessLimit = rateLimit({ windowMs: HOUR, max: 20 });
const refreshLimit = rateLimit({ windowMs: 15 * MINUTE, max: 60 });

router.post(
  "/signup",
  signupLimit,
  authController.handleSignup.bind(authController),
);
router.post(
  "/login",
  loginIpLimit,
  loginAccountLimit,
  authController.handleLogin.bind(authController),
);
router.post(
  "/verify-email",
  tokenGuessLimit,
  authController.handleVerifyEmail.bind(authController),
);
router.post(
  "/resend-verification",
  resendVerificationLimit,
  authController.handleResendVerification.bind(authController),
);
router.post(
  "/refresh",
  refreshLimit,
  authController.handleRefresh.bind(authController),
);
router.post(
  "/forgot-password",
  forgotPasswordIpLimit,
  forgotPasswordAccountLimit,
  authController.handleForgotPassword.bind(authController),
);
router.post(
  "/reset-password",
  tokenGuessLimit,
  authController.handleResetPassword.bind(authController),
);
router.get("/me", authenticate, authController.handleMe.bind(authController));
router.post(
  "/logout",
  authenticate,
  authController.handleLogout.bind(authController),
);

export default router;
