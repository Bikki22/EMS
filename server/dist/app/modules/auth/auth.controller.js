"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_services_1 = require("./auth.services");
const auth_validation_1 = require("./auth.validation");
const token_1 = require("../../utils/token");
const auth_model_1 = require("./auth.model");
const authService = new auth_services_1.AuthService();
const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};
class AuthenticationController {
    async handleSignup(req, res) {
        const validationData = await auth_validation_1.signupPayloadModel.safeParseAsync(req.body);
        if (!validationData.success) {
            return res.status(400).json({
                message: "Validation failed",
                error: validationData.error.issues,
            });
        }
        const existing = await auth_model_1.User.findOne({ email: validationData.data.email });
        if (existing) {
            return res.status(409).json({
                message: `User with email ${validationData.data.email} already exists`,
            });
        }
        const result = await authService.signup(validationData.data);
        return res.status(201).json({
            message: "Account created. Please verify your email.",
            data: { result },
        });
    }
    async handleVerifyEmail(req, res) {
        const result = await auth_validation_1.verifyEmailModel.safeParseAsync(req.body);
        if (!result.success) {
            return res.status(400).json({
                message: "Validation failed",
                error: result.error.issues,
            });
        }
        try {
            await authService.verifyEmail(result.data.token);
            return res.status(200).json({ message: "Email verified successfully" });
        }
        catch (err) {
            return res.status(400).json({ message: err.message });
        }
    }
    async handleLogin(req, res) {
        const result = await auth_validation_1.signinPayloadModel.safeParseAsync(req.body);
        if (!result.success) {
            return res.status(400).json({
                message: "Validation failed",
                error: result.error.issues,
            });
        }
        try {
            const { accessToken, refreshToken } = await authService.login(result.data);
            res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
            return res.status(200).json({
                message: "Login successful",
                data: { accessToken },
            });
        }
        catch (err) {
            return res.status(401).json({ message: err.message });
        }
    }
    async handleRefresh(req, res) {
        const token = req.cookies?.refreshToken;
        if (!token) {
            return res.status(401).json({ message: "No refresh token" });
        }
        let payload;
        try {
            payload = (0, token_1.verifyRefreshToken)(token);
        }
        catch {
            return res
                .status(401)
                .json({ message: "Invalid or expired refresh token" });
        }
        const user = await auth_model_1.User.findById(payload.sub).select("+refreshToken +refreshTokenFamily");
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }
        // token reuse detected — entire family compromised
        if (user.refreshTokenFamily !== payload.familyId) {
            await authService.logout(payload.sub);
            return res
                .status(401)
                .json({ message: "Token reuse detected. Please login again." });
        }
        if (user.refreshToken !== (0, token_1.hashToken)(token)) {
            await authService.logout(payload.sub);
            return res
                .status(401)
                .json({ message: "Token mismatch. Please login again." });
        }
        const { accessToken, refreshToken: newRefreshToken } = await authService.rotateRefreshToken(user._id.toString(), user.email, payload.familyId);
        res.cookie("refreshToken", newRefreshToken, REFRESH_COOKIE_OPTIONS);
        return res.status(200).json({
            message: "Token refreshed",
            data: { accessToken },
        });
    }
    async handleForgotPassword(req, res) {
        const result = await auth_validation_1.forgotPasswordModel.safeParseAsync(req.body);
        if (!result.success) {
            return res.status(400).json({
                message: "Validation failed",
                error: result.error.issues,
            });
        }
        await authService.forgotPassword(result.data.email);
        // always 200 — never reveal if email exists
        return res.status(200).json({
            message: "If that email exists, a reset link has been sent.",
        });
    }
    async handleResetPassword(req, res) {
        const result = await auth_validation_1.resetPasswordModel.safeParseAsync(req.body);
        if (!result.success) {
            return res.status(400).json({
                message: "Validation failed",
                error: result.error.issues,
            });
        }
        try {
            await authService.resetPassword(result.data.token, result.data.password);
            return res
                .status(200)
                .json({ message: "Password reset successfully. Please login again." });
        }
        catch (err) {
            return res.status(400).json({ message: err.message });
        }
    }
    async handleMe(req, res) {
        const user = await auth_model_1.User.findById(req.user?._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json({
            data: {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                isVerified: user.isVerified,
                roles: user.roles,
                avatarUrl: user.avatarUrl,
                lastLogin: user.lastLogin,
            },
        });
    }
    async handleLogout(req, res) {
        await authService.logout(req.user._id);
        res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
        return res.status(200).json({ message: "Logged out successfully" });
    }
}
exports.default = AuthenticationController;
//# sourceMappingURL=auth.controller.js.map