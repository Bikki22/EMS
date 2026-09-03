import type { Request, Response } from "express";
import { AuthService } from "./auth.services";
import {
  signinPayloadModel,
  signupPayloadModel,
  forgotPasswordModel,
  resetPasswordModel,
  verifyEmailModel,
  resendVerificationModel,
} from "./auth.validation";
import { verifyRefreshToken, hashToken } from "../../utils/token";
import { User } from "./auth.model";
import { AuthRequest } from "../../types/express";
import { env } from "../../config/env";

const authService = new AuthService();

const IS_PRODUCTION = env.NODE_ENV === "production";

// The SPA runs on a different origin (port 3000 in dev, often a different
// domain in production), so "strict" would stop the browser ever sending the
// refresh cookie back. "lax" is same-site-safe for localhost; cross-site
// deployments need "none" + secure.
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: (IS_PRODUCTION ? "none" : "lax") as "none" | "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const isDuplicateKeyError = (
  err: unknown,
): err is { code: number; keyPattern?: Record<string, unknown> } =>
  typeof err === "object" &&
  err !== null &&
  (err as { code?: unknown }).code === 11000;

class AuthenticationController {
  public async handleSignup(req: Request, res: Response) {
    const validationResult = await signupPayloadModel.safeParseAsync(req.body);

    if (!validationResult.success)
      return res.status(400).json({
        message: "body validation failed",
        error: validationResult.error.issues,
      });

    try {
      // No pre-flight existence check: the unique indexes on email and phone
      // are the real guard, and a read-then-write pair is racy anyway.
      const { user, emailSent } = await authService.signup(
        validationResult.data,
      );

      return res.status(201).json({
        message: emailSent
          ? "Account created. Check your email for the verification link."
          : "Account created, but the verification email could not be sent. Request a new one at /auth/resend-verification.",
        data: { id: user.id },
      });
    } catch (err: unknown) {
      if (isDuplicateKeyError(err)) {
        const field = Object.keys(err.keyPattern ?? { email: 1 })[0] ?? "email";
        return res.status(409).json({
          error: "duplicate entry",
          message: `user with this ${field} already exists`,
        });
      }

      console.error("signup error:", err);
      return res.status(500).json({
        error: "internal server error",
        message: "something went wrong while creating the user",
      });
    }
  }

  public async handleVerifyEmail(req: Request, res: Response) {
    const result = await verifyEmailModel.safeParseAsync(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        error: result.error.issues,
      });
    }

    try {
      await authService.verifyEmail(result.data.token);
      return res.status(200).json({ message: "Email verified successfully" });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }

  public async handleResendVerification(req: Request, res: Response) {
    const result = await resendVerificationModel.safeParseAsync(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        error: result.error.issues,
      });
    }

    await authService.resendVerification(result.data.email);

    // always 200 — never reveal whether the address exists or is already
    // verified
    return res.status(200).json({
      message: "If that account needs verifying, a new link has been sent.",
    });
  }

  public async handleLogin(req: Request, res: Response) {
    const result = await signinPayloadModel.safeParseAsync(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        error: result.error.issues,
      });
    }

    try {
      const { accessToken, refreshToken } = await authService.login(
        result.data,
      );
      res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
      return res.status(200).json({
        message: "Login successful",
        data: { accessToken },
      });
    } catch (err: any) {
      return res.status(401).json({ message: err.message });
    }
  }

  public async handleRefresh(req: Request, res: Response) {
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) {
      return res.status(401).json({ message: "No refresh token" });
    }

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      return res
        .status(401)
        .json({ message: "Invalid or expired refresh token" });
    }

    const user = await User.findById(payload.sub).select(
      "+refreshToken +refreshTokenFamily +previousRefreshToken +previousRefreshTokenExpiresAt",
    );

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Suspending an account has to end the sessions it already has, not just
    // block new logins — otherwise it keeps minting access tokens for a week.
    if (user.status !== "active") {
      await authService.logout(payload.sub);
      res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
      return res
        .status(403)
        .json({ message: "Your account has been suspended" });
    }

    // token reuse detected — entire family compromised
    if (user.refreshTokenFamily !== payload.familyId) {
      await authService.logout(payload.sub);
      return res
        .status(401)
        .json({ message: "Token reuse detected. Please login again." });
    }

    const presented = hashToken(token);
    const graceExpiry = user.previousRefreshTokenExpiresAt;
    const isCurrent = user.refreshToken === presented;
    const isWithinGrace =
      !!user.previousRefreshToken &&
      user.previousRefreshToken === presented &&
      !!graceExpiry &&
      graceExpiry.getTime() > Date.now();

    if (!isCurrent && !isWithinGrace) {
      await authService.logout(payload.sub);
      return res
        .status(401)
        .json({ message: "Token mismatch. Please login again." });
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await authService.rotateRefreshToken(
        user._id.toString(),
        user.email,
        user.roles,
        payload.familyId,
        // Whichever token was presented, it is the currently stored one that
        // is being superseded, so that is the one that gets the grace window.
        user.refreshToken,
      );

    res.cookie("refreshToken", newRefreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      message: "Token refreshed",
      data: { accessToken },
    });
  }

  public async handleForgotPassword(req: Request, res: Response) {
    const result = await forgotPasswordModel.safeParseAsync(req.body);
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

  public async handleResetPassword(req: Request, res: Response) {
    const result = await resetPasswordModel.safeParseAsync(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        error: result.error.issues,
      });
    }

    try {
      await authService.resetPassword(result.data.token, result.data.password);
      res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
      return res
        .status(200)
        .json({ message: "Password reset successfully. Please login again." });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }

  public async handleMe(req: Request, res: Response) {
    const user = await User.findById((req as AuthRequest).user?._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.status !== "active") {
      return res
        .status(403)
        .json({ message: "Your account has been suspended" });
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

  public async handleLogout(req: Request, res: Response) {
    const userId = (req as AuthRequest).user?._id;
    if (userId) {
      await authService.logout(userId);
    }
    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    return res.status(200).json({ message: "Logged out successfully" });
  }
}

export default AuthenticationController;
