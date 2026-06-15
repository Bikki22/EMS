"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = __importDefault(require("./auth.controller"));
const auth_middlewares_1 = require("../../middlewares/auth.middlewares");
const router = (0, express_1.Router)();
const authController = new auth_controller_1.default();
router.post("/signup", authController.handleSignup.bind(authController));
router.post("/login", authController.handleLogin.bind(authController));
router.post("/verify-email", authController.handleVerifyEmail.bind(authController));
router.post("/refresh", authController.handleRefresh.bind(authController));
router.post("/forgot-password", authController.handleForgotPassword.bind(authController));
router.post("/reset-password", authController.handleResetPassword.bind(authController));
router.get("/me", auth_middlewares_1.authenticate, authController.handleMe.bind(authController));
router.post("/logout", auth_middlewares_1.authenticate, authController.handleLogout.bind(authController));
exports.default = router;
//# sourceMappingURL=auth.route.js.map