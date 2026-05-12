import { User } from "./auth.model";
import { generateSalt, hashPassword, verifyPassword } from "../../utils/crypto";
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

export class AuthService {
  public async signup(data: RegisterData) {
    const { firstName, lastName, email, password, phone } = data;

    const salt = generateSalt();
    const hashedPassword = hashPassword(password, salt);
    const verificationToken = generateOpaqueToken();
    const verificationTokenHash = hashToken(verificationToken);

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      salt,
      phone,
      verificationToken: verificationTokenHash,
      verificationTokenExpiresAt: new Date(
        Date.now() + VERIFICATION_TOKEN_EXPIRY_MS,
      ),
    });

    await sendVerificationEmail(email, verificationToken);

    return user;
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

    if (!user.isVerified) {
      throw new Error("Please verify your email before logging in");
    }

    if (user.status !== "active") {
      throw new Error("Your account has been suspended");
    }

    const isValid = verifyPassword(password, user.salt, user.password);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    const { accessToken, refreshToken } = await this.issueTokenPair(
      user._id.toString(),
      user.email,
    );

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    return { accessToken, refreshToken };
  }

  public async issueTokenPair(userId: string, email: string) {
    const familyId = generateFamilyId();
    const jti = generateJti();

    const accessToken = issueAccessToken(userId, email);
    const refreshToken = issueRefreshToken(userId, familyId, jti);

    await User.findByIdAndUpdate(userId, {
      refreshToken: hashToken(refreshToken),
      refreshTokenFamily: familyId,
    });

    return { accessToken, refreshToken };
  }

  public async rotateRefreshToken(
    userId: string,
    email: string,
    familyId: string,
  ) {
    const jti = generateJti();
    const accessToken = issueAccessToken(userId, email);
    const refreshToken = issueRefreshToken(userId, familyId, jti);

    await User.findByIdAndUpdate(userId, {
      refreshToken: hashToken(refreshToken),
    });

    return { accessToken, refreshToken };
  }

  public async forgotPassword(email: string) {
    const user = await User.findOne({ email });

    // always resolve — never reveal if email exists
    if (!user) return;

    const resetToken = generateOpaqueToken();
    const resetTokenHash = hashToken(resetToken);

    await User.findByIdAndUpdate(user._id, {
      passwordResetToken: resetTokenHash,
      passwordResetTokenExpiresAt: new Date(
        Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MS,
      ),
    });

    await sendPasswordResetEmail(email, resetToken);
  }

  public async resetPassword(token: string, newPassword: string) {
    const tokenHash = hashToken(token);

    const user = await User.findOne({
      passwordResetToken: tokenHash,
      passwordResetTokenExpiresAt: { $gt: new Date() },
    }).select("+passwordResetToken +passwordResetTokenExpiresAt");

    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    const salt = generateSalt();
    const hashedPassword = hashPassword(newPassword, salt);

    user.password = hashedPassword;
    user.salt = salt;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiresAt = undefined;
    // invalidate all sessions on password reset
    user.refreshToken = null;
    user.refreshTokenFamily = null;

    await user.save();
  }

  public async logout(userId: string) {
    await User.findByIdAndUpdate(userId, {
      refreshToken: null,
      refreshTokenFamily: null,
    });
  }
}
