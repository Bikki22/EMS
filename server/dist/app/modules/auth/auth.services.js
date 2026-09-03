"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const auth_model_1 = require("./auth.model");
const crypto_1 = require("../../utils/crypto");
const token_1 = require("../../utils/token");
const email_1 = require("../../utils/email");
const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24h
const PASSWORD_RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1h
// How long a just-rotated refresh token keeps working. Long enough to absorb
// two tabs refreshing at once, short enough that a token stolen and replayed
// later still trips reuse detection.
const REFRESH_GRACE_MS = 30 * 1000;
class AuthService {
    async signup(data) {
        const { firstName, lastName, email, password, phone } = data;
        const verificationToken = (0, token_1.generateOpaqueToken)();
        const user = await auth_model_1.User.create({
            firstName,
            lastName,
            email,
            password: await (0, crypto_1.hashPassword)(password),
            phone,
            verificationToken: (0, token_1.hashToken)(verificationToken),
            verificationTokenExpiresAt: new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS),
        });
        // The account is unusable until this arrives, but a mail outage should not
        // fail an otherwise-good signup — /auth/resend-verification is there to
        // retry. The caller reports which of the two happened.
        const emailSent = await this.trySendVerificationEmail(email, verificationToken);
        return { user, emailSent };
    }
    async trySendVerificationEmail(email, token) {
        try {
            await (0, email_1.sendVerificationEmail)(email, token);
            return true;
        }
        catch (err) {
            console.error("failed to send verification email:", err);
            return false;
        }
    }
    async resendVerification(email) {
        const user = await auth_model_1.User.findOne({ email });
        // Resolve either way — whether the address is registered, and whether it
        // is already verified, are both things a stranger should not learn here.
        if (!user || user.isVerified)
            return;
        const verificationToken = (0, token_1.generateOpaqueToken)();
        await auth_model_1.User.findByIdAndUpdate(user._id, {
            verificationToken: (0, token_1.hashToken)(verificationToken),
            verificationTokenExpiresAt: new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS),
        });
        await this.trySendVerificationEmail(email, verificationToken);
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
        // Check the password before the account-state checks. Answering "verify
        // your email" or "suspended" to anyone who submits a wrong password tells
        // them the address is registered and what state it is in.
        const isValid = await (0, crypto_1.verifyPassword)(password, user.password, user.salt);
        if (!isValid) {
            throw new Error("Invalid credentials");
        }
        if (!user.isVerified) {
            throw new Error("Please verify your email before logging in");
        }
        if (user.status !== "active") {
            throw new Error("Your account has been suspended");
        }
        // A successful login is the only moment we hold the plaintext, so it is
        // also the only chance to move a legacy HMAC-SHA256 account onto bcrypt.
        if ((0, crypto_1.isLegacyPasswordHash)(user.password)) {
            await auth_model_1.User.findByIdAndUpdate(user._id, {
                $set: { password: await (0, crypto_1.hashPassword)(password) },
                $unset: { salt: 1 },
            });
        }
        const { accessToken, refreshToken } = await this.issueTokenPair(user._id.toString(), user.email, user.roles);
        await auth_model_1.User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
        return { accessToken, refreshToken };
    }
    async issueTokenPair(userId, email, roles) {
        const familyId = (0, token_1.generateFamilyId)();
        const refreshToken = (0, token_1.issueRefreshToken)(userId, familyId, (0, token_1.generateJti)());
        await auth_model_1.User.findByIdAndUpdate(userId, {
            refreshToken: (0, token_1.hashToken)(refreshToken),
            refreshTokenFamily: familyId,
            previousRefreshToken: null,
            previousRefreshTokenExpiresAt: null,
        });
        return {
            accessToken: (0, token_1.issueAccessToken)(userId, email, roles),
            refreshToken,
        };
    }
    /**
     * Mints a new pair inside the same family. `supersededTokenHash` is the hash
     * that was current until now; it stays acceptable for REFRESH_GRACE_MS so a
     * parallel refresh from another tab is not mistaken for token theft.
     */
    async rotateRefreshToken(userId, email, roles, familyId, supersededTokenHash) {
        const refreshToken = (0, token_1.issueRefreshToken)(userId, familyId, (0, token_1.generateJti)());
        await auth_model_1.User.findByIdAndUpdate(userId, {
            refreshToken: (0, token_1.hashToken)(refreshToken),
            previousRefreshToken: supersededTokenHash,
            previousRefreshTokenExpiresAt: supersededTokenHash
                ? new Date(Date.now() + REFRESH_GRACE_MS)
                : null,
        });
        return {
            accessToken: (0, token_1.issueAccessToken)(userId, email, roles),
            refreshToken,
        };
    }
    async forgotPassword(email) {
        const user = await auth_model_1.User.findOne({ email });
        // always resolve — never reveal if email exists
        if (!user)
            return;
        const resetToken = (0, token_1.generateOpaqueToken)();
        await auth_model_1.User.findByIdAndUpdate(user._id, {
            passwordResetToken: (0, token_1.hashToken)(resetToken),
            passwordResetTokenExpiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MS),
        });
        try {
            await (0, email_1.sendPasswordResetEmail)(email, resetToken);
        }
        catch (err) {
            // Letting an SMTP failure escape turns the deliberately vague 200 into a
            // 500, and that difference alone tells an attacker the address is
            // registered — exactly what this endpoint is written to hide.
            console.error("failed to send password reset email:", err);
        }
    }
    async resetPassword(token, newPassword) {
        const tokenHash = (0, token_1.hashToken)(token);
        const user = await auth_model_1.User.findOne({
            passwordResetToken: tokenHash,
            passwordResetTokenExpiresAt: { $gt: new Date() },
        }).select("+password +salt +passwordResetToken +passwordResetTokenExpiresAt");
        if (!user) {
            throw new Error("Invalid or expired reset token");
        }
        user.password = await (0, crypto_1.hashPassword)(newPassword);
        user.salt = undefined;
        user.passwordResetToken = undefined;
        user.passwordResetTokenExpiresAt = undefined;
        // invalidate all sessions on password reset
        user.refreshToken = null;
        user.refreshTokenFamily = null;
        user.previousRefreshToken = null;
        user.previousRefreshTokenExpiresAt = null;
        await user.save();
    }
    async logout(userId) {
        await auth_model_1.User.findByIdAndUpdate(userId, {
            refreshToken: null,
            refreshTokenFamily: null,
            previousRefreshToken: null,
            previousRefreshTokenExpiresAt: null,
        });
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.services.js.map