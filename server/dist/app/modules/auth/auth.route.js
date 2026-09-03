"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = __importDefault(require("./auth.controller"));
const auth_middlewares_1 = require("../../middlewares/auth.middlewares");
const rateLimit_middleware_1 = require("../../middlewares/rateLimit.middleware");
const router = (0, express_1.Router)();
const authController = new auth_controller_1.default();
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
// Credential endpoints get two ceilings: a broad per-IP one, and a tighter
// per-account one so an attacker rotating addresses from a single IP can't buy
// themselves a fresh budget for every account they target.
const loginIpLimit = (0, rateLimit_middleware_1.rateLimit)({
    windowMs: 15 * MINUTE,
    max: 20,
    message: "Too many login attempts. Please try again in a few minutes.",
});
const loginAccountLimit = (0, rateLimit_middleware_1.rateLimit)({
    windowMs: 15 * MINUTE,
    max: 5,
    key: rateLimit_middleware_1.byBodyEmail,
    message: "Too many login attempts for this account. Please try again later.",
});
const forgotPasswordIpLimit = (0, rateLimit_middleware_1.rateLimit)({
    windowMs: HOUR,
    max: 5,
    message: "Too many password reset requests. Please try again later.",
});
const forgotPasswordAccountLimit = (0, rateLimit_middleware_1.rateLimit)({
    windowMs: HOUR,
    max: 3,
    key: rateLimit_middleware_1.byBodyEmail,
    message: "Too many password reset requests. Please try again later.",
});
const resendVerificationLimit = (0, rateLimit_middleware_1.rateLimit)({
    windowMs: HOUR,
    max: 3,
    key: rateLimit_middleware_1.byBodyEmail,
    message: "Too many verification emails requested. Please try again later.",
});
const signupLimit = (0, rateLimit_middleware_1.rateLimit)({ windowMs: HOUR, max: 10 });
const tokenGuessLimit = (0, rateLimit_middleware_1.rateLimit)({ windowMs: HOUR, max: 20 });
const refreshLimit = (0, rateLimit_middleware_1.rateLimit)({ windowMs: 15 * MINUTE, max: 60 });
router.post("/signup", signupLimit, authController.handleSignup.bind(authController));
router.post("/login", loginIpLimit, loginAccountLimit, authController.handleLogin.bind(authController));
router.post("/verify-email", tokenGuessLimit, authController.handleVerifyEmail.bind(authController));
router.post("/resend-verification", resendVerificationLimit, authController.handleResendVerification.bind(authController));
router.post("/refresh", refreshLimit, authController.handleRefresh.bind(authController));
router.post("/forgot-password", forgotPasswordIpLimit, forgotPasswordAccountLimit, authController.handleForgotPassword.bind(authController));
router.post("/reset-password", tokenGuessLimit, authController.handleResetPassword.bind(authController));
router.get("/me", auth_middlewares_1.authenticate, authController.handleMe.bind(authController));
router.post("/logout", auth_middlewares_1.authenticate, authController.handleLogout.bind(authController));
exports.default = router;
//# sourceMappingURL=auth.route.js.map