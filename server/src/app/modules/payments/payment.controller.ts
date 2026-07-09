import type { RequestHandler } from "express";
import { asyncHandler } from "../../utils/AsyncHandler";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { AuthRequest } from "../../types/express";
import { User } from "../auth/auth.model";
import { paymentService } from "./payment.service";
import { initiatePaymentSchema } from "./payment.validation";

const CLIENT_URL = (
  process.env.CLIENT_URL || "http://localhost:3000"
).replace(/\/$/, "");

class PaymentController {
  // ─── POST /api/v1/payments/initiate ────────────────────────
  // Auth required. Starts a payment for a pending booking and returns the
  // provider-specific instructions the client needs to redirect the payer.
  public initiate: RequestHandler = asyncHandler(async (req, res) => {
    const result = await initiatePaymentSchema.safeParseAsync(req.body);
    if (!result.success) {
      throw new ApiError(
        400,
        "Validation failed",
        result.error.issues.map((i) => i.message),
      );
    }

    const userId = (req as AuthRequest).user?._id;
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const user = await User.findById(userId).lean();
    const customer = user
      ? {
          name: `${user.firstName} ${user.lastName ?? ""}`.trim(),
          email: user.email,
          phone: user.phone,
        }
      : undefined;

    const payment = await paymentService.initiate(
      result.data.bookingId,
      result.data.provider,
      userId,
      customer,
    );

    res
      .status(200)
      .json(new ApiResponse(200, payment, "Payment initiated"));
  });

  // ─── GET /api/v1/payments/khalti/callback ──────────────────
  // Public. Khalti redirects the payer's browser here with ?pidx=...
  public khaltiCallback: RequestHandler = asyncHandler(async (req, res) => {
    const pidx = req.query.pidx as string | undefined;
    if (!pidx) {
      return res.redirect(`${CLIENT_URL}/payment/failure?reason=missing_pidx`);
    }

    try {
      const { bookingId, confirmed } = await paymentService.verifyKhalti(pidx);
      const target = confirmed ? "success" : "failure";
      return res.redirect(
        `${CLIENT_URL}/payment/${target}?bookingId=${bookingId}`,
      );
    } catch (err) {
      const reason = encodeURIComponent(
        err instanceof Error ? err.message : "verification_failed",
      );
      return res.redirect(`${CLIENT_URL}/payment/failure?reason=${reason}`);
    }
  });

  // ─── GET /api/v1/payments/esewa/callback ───────────────────
  // Public. eSewa redirects here with a base64 ?data=... payload on success.
  public esewaCallback: RequestHandler = asyncHandler(async (req, res) => {
    const data = req.query.data as string | undefined;
    if (!data) {
      return res.redirect(`${CLIENT_URL}/payment/failure?reason=missing_data`);
    }

    try {
      const { bookingId, confirmed } = await paymentService.verifyEsewa(data);
      const target = confirmed ? "success" : "failure";
      return res.redirect(
        `${CLIENT_URL}/payment/${target}?bookingId=${bookingId}`,
      );
    } catch (err) {
      const reason = encodeURIComponent(
        err instanceof Error ? err.message : "verification_failed",
      );
      return res.redirect(`${CLIENT_URL}/payment/failure?reason=${reason}`);
    }
  });
}

export const paymentController = new PaymentController();
