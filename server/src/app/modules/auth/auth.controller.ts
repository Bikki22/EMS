import type { Request, Response } from "express";
import { AuthService } from "./auth.services";
import {
  signinPayloadModel,
  signupPayloadModel,
  forgotPasswordModel,
  resetPasswordModel,
  verifyEmailModel,
} from "./auth.validation";
import { verifyRefreshToken, hashToken } from "../../utils/token";
import { User } from "./auth.model";
import { AuthRequest } from "../../types/express";

const authService = new AuthService();

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

class AuthenticationController {
  public async handleSignup(req: Request, res: Response) {
    const validationData = await signupPayloadModel.safeParseAsync(req.body);
    if (!validationData.success) {
      return res.status(400).json({
        message: "Validation failed",
        error: validationData.error.issues,
      });
    }

    const existing = await User.findOne({ email: validationData.data.email });

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
      "+refreshToken +refreshTokenFamily",
    );

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

    if (user.refreshToken !== hashToken(token)) {
      await authService.logout(payload.sub);
      return res
        .status(401)
        .json({ message: "Token mismatch. Please login again." });
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await authService.rotateRefreshToken(
        user._id.toString(),
        user.email,
        payload.familyId,
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
    await authService.logout((req as AuthRequest).user!._id);
    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    return res.status(200).json({ message: "Logged out successfully" });
  }
}

export default AuthenticationController;
