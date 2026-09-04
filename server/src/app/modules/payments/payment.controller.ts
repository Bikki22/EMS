import type { RequestHandler } from "express";
import { asyncHandler } from "../../utils/AsyncHandler";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { AuthRequest } from "../../types/express";
import { env } from "../../config/env";
import { User } from "../auth/auth.model";
import { paymentService } from "./payment.service";
import { initiatePaymentSchema } from "./payment.validation";

const CLIENT_URL = (env.CLIENT_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);

/**
 * Khalti validates customer_info and rejects the whole initiate call over a
 * malformed phone number — which turns an optional convenience field into a
 * hard failure for any user whose stored phone is not a plain 10-digit
 * Nepali mobile number. Send it only when it will pass.
 */
const khaltiSafePhone = (phone?: string): string | undefined => {
  const digits = phone?.replace(/\D/g, "") ?? "";
  const local = digits.startsWith("977") ? digits.slice(3) : digits;
  return /^9\d{9}$/.test(local) ? local : undefined;
};

/** Redirect back to the client without leaking internals into the URL. */
const failureRedirect = (reason: string, bookingId?: string): string => {
  const params = new URLSearchParams({ reason });
  if (bookingId) params.set("bookingId", bookingId);
  return `${CLIENT_URL}/payment/failure?${params.toString()}`;
};

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
    let customer: { name?: string; email?: string; phone?: string } | undefined;
    if (user) {
      const phone = khaltiSafePhone(user.phone);
      customer = {
        name: `${user.firstName} ${user.lastName ?? ""}`.trim(),
        email: user.email,
        ...(phone ? { phone } : {}),
      };
    }

    const payment = await paymentService.initiate(
      result.data.bookingId,
      result.data.provider,
      userId,
      customer,
    );

    res.status(200).json(new ApiResponse(200, payment, "Payment initiated"));
  });

  // ─── GET /api/v1/payments/khalti/callback ──────────────────
  // Public. Khalti redirects the payer's browser here with ?pidx=...
  public khaltiCallback: RequestHandler = asyncHandler(async (req, res) => {
    const pidx = typeof req.query.pidx === "string" ? req.query.pidx : undefined;
    if (!pidx) {
      return res.redirect(failureRedirect("missing_pidx"));
    }

    try {
      const { bookingId, confirmed } = await paymentService.verifyKhalti(pidx);
      if (!confirmed) {
        return res.redirect(failureRedirect("payment_not_completed", bookingId));
      }
      return res.redirect(
        `${CLIENT_URL}/payment/success?bookingId=${encodeURIComponent(bookingId)}`,
      );
    } catch (err) {
      // The message is shown to the payer, so keep it to something a person
      // can act on; the detail is already on the payment record and in logs.
      console.error("khalti callback verification failed:", err);
      return res.redirect(
        failureRedirect(
          err instanceof ApiError ? err.message : "verification_failed",
        ),
      );
    }
  });

  // ─── GET /api/v1/payments/esewa/callback ───────────────────
  // Public. eSewa redirects here with a base64 ?data=... payload on success.
  public esewaCallback: RequestHandler = asyncHandler(async (req, res) => {
    const data = typeof req.query.data === "string" ? req.query.data : undefined;
    if (!data) {
      return res.redirect(failureRedirect("missing_data"));
    }

    try {
      const { bookingId, confirmed } = await paymentService.verifyEsewa(data);
      if (!confirmed) {
        return res.redirect(failureRedirect("payment_not_completed", bookingId));
      }
      return res.redirect(
        `${CLIENT_URL}/payment/success?bookingId=${encodeURIComponent(bookingId)}`,
      );
    } catch (err) {
      console.error("esewa callback verification failed:", err);
      return res.redirect(
        failureRedirect(
          err instanceof ApiError ? err.message : "verification_failed",
        ),
      );
    }
  });
}

export const paymentController = new PaymentController();
