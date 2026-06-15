"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const auth_model_1 = require("./auth.model");
const crypto_1 = require("../../utils/crypto");
const token_1 = require("../../utils/token");
const email_1 = require("../../utils/email");
const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24h
const PASSWORD_RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1h
class AuthService {
    async signup(data) {
        const { firstName, lastName, email, password, phone } = data;
        const salt = (0, crypto_1.generateSalt)();
        const hashedPassword = (0, crypto_1.hashPassword)(password, salt);
        const verificationToken = (0, token_1.generateOpaqueToken)();
        const verificationTokenHash = (0, token_1.hashToken)(verificationToken);
        const user = await auth_model_1.User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            salt,
            phone,
            verificationToken: verificationTokenHash,
            verificationTokenExpiresAt: new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS),
        });
        await (0, email_1.sendVerificationEmail)(email, verificationToken);
        return user;
    }
    async verifyEmail(token) {
        const tokenHash = (0, token_1.hashToken)(token);
        const user = await auth_model_1.User.findOne({
            verificationToken: tokenHash,
            verificationTokenExpiresAt: { $gt: new Date() },
        }).select("+verificationToken +verificationTokenExpiresAt");
        if (!user) {
            throw new Error("Invalid or expired verification token");
        }
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiresAt = undefined;
        await user.save();
    }
    async login(data) {
        const { email, password } = data;
        const user = await auth_model_1.User.findOne({ email }).select("+password +salt +refreshToken +refreshTokenFamily");
        if (!user) {
            throw new Error("Invalid credentials");
        }
        if (!user.isVerified) {
            throw new Error("Please verify your email before logging in");
        }
        if (user.status !== "active") {
            throw new Error("Your account has been suspended");
        }
        const isValid = (0, crypto_1.verifyPassword)(password, user.salt, user.password);
        if (!isValid) {
            throw new Error("Invalid credentials");
        }
        const { accessToken, refreshToken } = await this.issueTokenPair(user._id.toString(), user.email);
        await auth_model_1.User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
        return { accessToken, refreshToken };
    }
    async issueTokenPair(userId, email) {
        const familyId = (0, token_1.generateFamilyId)();
        const jti = (0, token_1.generateJti)();
        const accessToken = (0, token_1.issueAccessToken)(userId, email);
        const refreshToken = (0, token_1.issueRefreshToken)(userId, familyId, jti);
        await auth_model_1.User.findByIdAndUpdate(userId, {
            refreshToken: (0, token_1.hashToken)(refreshToken),
            refreshTokenFamily: familyId,
        });
        return { accessToken, refreshToken };
    }
    async rotateRefreshToken(userId, email, familyId) {
        const jti = (0, token_1.generateJti)();
        const accessToken = (0, token_1.issueAccessToken)(userId, email);
        const refreshToken = (0, token_1.issueRefreshToken)(userId, familyId, jti);
        await auth_model_1.User.findByIdAndUpdate(userId, {
            refreshToken: (0, token_1.hashToken)(refreshToken),
        });
        return { accessToken, refreshToken };
    }
    async forgotPassword(email) {
        const user = await auth_model_1.User.findOne({ email });
        // always resolve — never reveal if email exists
        if (!user)
            return;
        const resetToken = (0, token_1.generateOpaqueToken)();
        const resetTokenHash = (0, token_1.hashToken)(resetToken);
        await auth_model_1.User.findByIdAndUpdate(user._id, {
            passwordResetToken: resetTokenHash,
            passwordResetTokenExpiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MS),
        });
        await (0, email_1.sendPasswordResetEmail)(email, resetToken);
    }
    async resetPassword(token, newPassword) {
        const tokenHash = (0, token_1.hashToken)(token);
        const user = await auth_model_1.User.findOne({
            passwordResetToken: tokenHash,
            passwordResetTokenExpiresAt: { $gt: new Date() },
        }).select("+passwordResetToken +passwordResetTokenExpiresAt");
        if (!user) {
            throw new Error("Invalid or expired reset token");
        }
        const salt = (0, crypto_1.generateSalt)();
        const hashedPassword = (0, crypto_1.hashPassword)(newPassword, salt);
        user.password = hashedPassword;
        user.salt = salt;
        user.passwordResetToken = undefined;
        user.passwordResetTokenExpiresAt = undefined;
        // invalidate all sessions on password reset
        user.refreshToken = null;
        user.refreshTokenFamily = null;
        await user.save();
    }
    async logout(userId) {
        await auth_model_1.User.findByIdAndUpdate(userId, {
            refreshToken: null,
            refreshTokenFamily: null,
        });
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.services.js.map