import { User } from "./auth.model";
import {
  hashPassword,
  isLegacyPasswordHash,
  verifyPassword,
} from "../../utils/crypto";
import {
  generateFamilyId,
  generateJti,
  generateOpaqueToken,
  hashToken,
  issueAccessToken,
  issueRefreshToken,
} from "../../utils/token";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../../utils/email";
import type { RegisterData, LoginData } from "./auth.types";

const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24h
const PASSWORD_RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1h

// How long a just-rotated refresh token keeps working. Long enough to absorb
// two tabs refreshing at once, short enough that a token stolen and replayed
// later still trips reuse detection.
const REFRESH_GRACE_MS = 30 * 1000;

export class AuthService {
  public async signup(data: RegisterData) {
    const { firstName, lastName, email, password, phone } = data;

    const verificationToken = generateOpaqueToken();

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: await hashPassword(password),
      phone,
      verificationToken: hashToken(verificationToken),
      verificationTokenExpiresAt: new Date(
        Date.now() + VERIFICATION_TOKEN_EXPIRY_MS,
      ),
    });

    // The account is unusable until this arrives, but a mail outage should not
    // fail an otherwise-good signup — /auth/resend-verification is there to
    // retry. The caller reports which of the two happened.
    const emailSent = await this.trySendVerificationEmail(
      email,
      verificationToken,
    );

    return { user, emailSent };
  }

  private async trySendVerificationEmail(
    email: string,
    token: string,
  ): Promise<boolean> {
    try {
      await sendVerificationEmail(email, token);
      return true;
    } catch (err) {
      console.error("failed to send verification email:", err);
      return false;
    }
  }

  public async resendVerification(email: string) {
    const user = await User.findOne({ email });

    // Resolve either way — whether the address is registered, and whether it
    // is already verified, are both things a stranger should not learn here.
    if (!user || user.isVerified) return;

    const verificationToken = generateOpaqueToken();

    await User.findByIdAndUpdate(user._id, {
      verificationToken: hashToken(verificationToken),
      verificationTokenExpiresAt: new Date(
        Date.now() + VERIFICATION_TOKEN_EXPIRY_MS,
      ),
    });

    await this.trySendVerificationEmail(email, verificationToken);
  }

  public async verifyEmail(token: string) {
    const tokenHash = hashToken(token);

    const user = await User.findOne({
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

  public async login(data: LoginData) {
    const { email, password } = data;

    const user = await User.findOne({ email }).select(
      "+password +salt +refreshToken +refreshTokenFamily",
    );

    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Check the password before the account-state checks. Answering "verify
    // your email" or "suspended" to anyone who submits a wrong password tells
    // them the address is registered and what state it is in.
    const isValid = await verifyPassword(password, user.password, user.salt);
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
    if (isLegacyPasswordHash(user.password)) {
      await User.findByIdAndUpdate(user._id, {
        $set: { password: await hashPassword(password) },
        $unset: { salt: 1 },
      });
    }

    const { accessToken, refreshToken } = await this.issueTokenPair(
      user._id.toString(),
      user.email,
      user.roles,
    );

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    return { accessToken, refreshToken };
  }

  public async issueTokenPair(userId: string, email: string, roles: string) {
    const familyId = generateFamilyId();
    const refreshToken = issueRefreshToken(userId, familyId, generateJti());

    await User.findByIdAndUpdate(userId, {
      refreshToken: hashToken(refreshToken),
      refreshTokenFamily: familyId,
      previousRefreshToken: null,
      previousRefreshTokenExpiresAt: null,
    });

    return {
      accessToken: issueAccessToken(userId, email, roles),
      refreshToken,
    };
  }

  /**
   * Mints a new pair inside the same family. `supersededTokenHash` is the hash
   * that was current until now; it stays acceptable for REFRESH_GRACE_MS so a
   * parallel refresh from another tab is not mistaken for token theft.
   */
  public async rotateRefreshToken(
    userId: string,
    email: string,
    roles: string,
    familyId: string,
    supersededTokenHash: string | null,
  ) {
    const refreshToken = issueRefreshToken(userId, familyId, generateJti());

    await User.findByIdAndUpdate(userId, {
      refreshToken: hashToken(refreshToken),
      previousRefreshToken: supersededTokenHash,
      previousRefreshTokenExpiresAt: supersededTokenHash
        ? new Date(Date.now() + REFRESH_GRACE_MS)
        : null,
    });

    return {
      accessToken: issueAccessToken(userId, email, roles),
      refreshToken,
    };
  }

  public async forgotPassword(email: string) {
    const user = await User.findOne({ email });

    // always resolve — never reveal if email exists
    if (!user) return;

    const resetToken = generateOpaqueToken();

    await User.findByIdAndUpdate(user._id, {
      passwordResetToken: hashToken(resetToken),
      passwordResetTokenExpiresAt: new Date(
        Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MS,
      ),
    });

    try {
      await sendPasswordResetEmail(email, resetToken);
    } catch (err) {
      // Letting an SMTP failure escape turns the deliberately vague 200 into a
      // 500, and that difference alone tells an attacker the address is
      // registered — exactly what this endpoint is written to hide.
      console.error("failed to send password reset email:", err);
    }
  }

  public async resetPassword(token: string, newPassword: string) {
    const tokenHash = hashToken(token);

    const user = await User.findOne({
      passwordResetToken: tokenHash,
      passwordResetTokenExpiresAt: { $gt: new Date() },
    }).select(
      "+password +salt +passwordResetToken +passwordResetTokenExpiresAt",
    );

    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    user.password = await hashPassword(newPassword);
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

  public async logout(userId: string) {
    await User.findByIdAndUpdate(userId, {
      refreshToken: null,
      refreshTokenFamily: null,
      previousRefreshToken: null,
      previousRefreshTokenExpiresAt: null,
    });
  }
}
