import { Types } from "mongoose";
import { Payment, type IPayment } from "./payment.model";
import { Booking } from "../bookings/booking.model";
import { bookingService } from "../bookings/booking.service";
import { ApiError } from "../../utils/ApiError";
import { env } from "../../config/env";
import {
  khaltiInitiate,
  khaltiLookup,
  KHALTI_MIN_PAISA,
  type KhaltiInitiateResponse,
  type KhaltiStatus,
} from "../../libs/khalti";
import {
  esewaBuildForm,
  esewaDecodeCallback,
  esewaVerifyCallbackSignature,
  esewaCheckStatus,
  esewaParseAmount,
  esewaAmountsMatch,
  type EsewaFormPayload,
} from "../../libs/esewa";

const SERVER_URL = (env.SERVER_URL || "http://localhost:8000").replace(
  /\/$/,
  "",
);
const CLIENT_URL = (env.CLIENT_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);

/**
 * Khalti statuses that mean the payer is done and did not pay. Everything
 * else short of "Completed" ("Pending", "Initiated") means the payment is
 * still in flight: marking those failed buries a payment that may yet settle,
 * and the record never recovers because nothing looks at failed payments again.
 */
const KHALTI_TERMINAL_FAILURES: ReadonlySet<KhaltiStatus> = new Set([
  "Expired",
  "User canceled",
]);

export interface KhaltiInitiateResult {
  provider: "khalti";
  paymentId: string;
  method: "redirect";
  paymentUrl: string;
  pidx: string;
}

export interface EsewaInitiateResult extends EsewaFormPayload {
  provider: "esewa";
  paymentId: string;
}

export type InitiateResult = KhaltiInitiateResult | EsewaInitiateResult;

export class PaymentService {
  /** Load a bookable (pending, unexpired, owned) booking or throw. */
  private async loadPayableBooking(bookingId: string, userId: string) {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }
    if (booking.user.toString() !== userId) {
      throw new ApiError(403, "You can only pay for your own bookings");
    }
    if (booking.status === "Confirmed") {
      throw new ApiError(400, "This booking is already paid and confirmed");
    }
    if (booking.status !== "Pending") {
      throw new ApiError(
        400,
        `Cannot pay for a booking with status "${booking.status}"`,
      );
    }
    if (booking.expiresAt && booking.expiresAt.getTime() < Date.now()) {
      throw new ApiError(400, "This reservation has expired. Please rebook.");
    }
    if (booking.totalAmount <= 0) {
      throw new ApiError(400, "This booking does not require payment");
    }
    return booking;
  }

  public async initiate(
    bookingId: string,
    provider: "khalti" | "esewa",
    userId: string,
    customer?: { name?: string; email?: string; phone?: string },
  ): Promise<InitiateResult> {
    const booking = await this.loadPayableBooking(bookingId, userId);

    // The booking status check above is not enough on its own: a payment can
    // settle at the provider while the booking is still Pending here (the
    // callback has not landed yet). Without this, that payer opens a second
    // checkout and pays twice for one booking.
    const settled = await Payment.findOne({
      booking: booking._id,
      status: "completed",
    });
    if (settled) {
      throw new ApiError(409, "This booking has already been paid for");
    }

    // Reuse a checkout that is still live rather than opening another one
    // beside it — two open sessions for one booking is two chargeable
    // sessions, and only one of them can ever confirm the booking.
    const live = await this.findLivePayment(booking._id, provider);
    if (live) {
      const reused = await this.resultForExistingPayment(live, booking);
      if (reused) return reused;
      // Not reusable (unusable provider response, or it was opened for a
      // different total). Retire it so it is not picked up again and so a
      // stray settlement against it stands out.
      await this.markFailed(
        live,
        new Error("Superseded by a new checkout session"),
      );
    }

    const payment = await Payment.create({
      booking: booking._id,
      user: booking.user,
      provider,
      amount: booking.totalAmount,
      currency: booking.currency || "NPR",
      status: "initiated",
    });

    if (provider === "khalti") {
      const amountPaisa = Math.round(booking.totalAmount * 100);
      if (amountPaisa < KHALTI_MIN_PAISA) {
        // Khalti rejects this with an opaque field error; say so plainly and
        // do not leave an orphan initiated payment behind.
        await this.markFailed(
          payment,
          new Error(`Khalti requires at least NPR ${KHALTI_MIN_PAISA / 100}`),
        );
        throw new ApiError(
          400,
          `Khalti payments must be at least NPR ${KHALTI_MIN_PAISA / 100}. Please choose another method.`,
        );
      }

      let khaltiRes: KhaltiInitiateResponse;
      try {
        khaltiRes = await khaltiInitiate({
          returnUrl: `${SERVER_URL}/api/v1/payments/khalti/callback`,
          websiteUrl: CLIENT_URL,
          amountPaisa,
          purchaseOrderId: booking._id.toString(),
          purchaseOrderName: `Booking ${booking._id.toString()}`,
          ...(customer ? { customerInfo: customer } : {}),
        });
      } catch (err) {
        await this.markFailed(payment, err);
        throw new ApiError(
          502,
          err instanceof Error ? err.message : "Khalti initiation failed",
        );
      }

      payment.pidx = khaltiRes.pidx;
      payment.raw = khaltiRes;
      const expiresAt = this.khaltiExpiry(khaltiRes);
      if (expiresAt) payment.providerExpiresAt = expiresAt;
      await payment.save();

      return {
        provider: "khalti",
        paymentId: payment._id.toString(),
        method: "redirect",
        paymentUrl: khaltiRes.payment_url,
        pidx: khaltiRes.pidx,
      };
    }

    // eSewa — the client submits the returned form to eSewa.
    const transactionUuid = payment._id.toString();
    payment.transactionUuid = transactionUuid;
    await payment.save();

    return {
      provider: "esewa",
      paymentId: payment._id.toString(),
      ...this.buildEsewaForm(booking._id.toString(), booking.totalAmount, transactionUuid),
    };
  }

  private buildEsewaForm(
    bookingId: string,
    amount: number,
    transactionUuid: string,
  ): EsewaFormPayload {
    return esewaBuildForm({
      amount,
      transactionUuid,
      successUrl: `${SERVER_URL}/api/v1/payments/esewa/callback`,
      failureUrl: `${CLIENT_URL}/payment/failure?bookingId=${bookingId}`,
    });
  }

  private khaltiExpiry(res: KhaltiInitiateResponse): Date | undefined {
    if (res.expires_at) {
      const parsed = new Date(res.expires_at);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    if (typeof res.expires_in === "number" && res.expires_in > 0) {
      return new Date(Date.now() + res.expires_in * 1000);
    }
    return undefined;
  }

  /** An `initiated` payment for this booking whose checkout has not lapsed. */
  private async findLivePayment(
    bookingId: Types.ObjectId,
    provider: "khalti" | "esewa",
  ): Promise<IPayment | null> {
    return Payment.findOne({
      booking: bookingId,
      provider,
      status: "initiated",
      $or: [
        { providerExpiresAt: { $exists: false } },
        { providerExpiresAt: null },
        { providerExpiresAt: { $gt: new Date() } },
      ],
    }).sort({ createdAt: -1 });
  }

  private async resultForExistingPayment(
    payment: IPayment,
    booking: { _id: Types.ObjectId; totalAmount: number },
  ): Promise<InitiateResult | null> {
    // The amount may have changed under the old session; do not resurrect one
    // that would charge the wrong total.
    if (Math.round(payment.amount * 100) !== Math.round(booking.totalAmount * 100)) {
      return null;
    }

    if (payment.provider === "khalti") {
      const raw = payment.raw as Partial<KhaltiInitiateResponse> | undefined;
      if (!payment.pidx || !raw?.payment_url) return null;
      return {
        provider: "khalti",
        paymentId: payment._id.toString(),
        method: "redirect",
        paymentUrl: raw.payment_url,
        pidx: payment.pidx,
      };
    }

    if (!payment.transactionUuid) return null;
    return {
      provider: "esewa",
      paymentId: payment._id.toString(),
      ...this.buildEsewaForm(
        booking._id.toString(),
        payment.amount,
        payment.transactionUuid,
      ),
    };
  }

  private async markFailed(payment: IPayment, err: unknown) {
    payment.status = "failed";
    payment.raw = err instanceof Error ? { error: err.message } : err;
    await payment.save();
  }

  /**
   * Confirm the booking behind a payment that has already been captured.
   *
   * The seat hold can lapse (or the booking be cancelled) while the payer is
   * on the provider's page. The money is real by then, so a confirm failure
   * is not just an error to rethrow — it has to leave a record that this
   * payer is owed a refund, otherwise the payment sits as "completed" against
   * a booking nobody will ever honour.
   */
  private async confirmPaidBooking(
    payment: IPayment,
    paymentIntentId: string,
  ): Promise<void> {
    try {
      await bookingService.confirmBooking(payment.booking, { paymentIntentId });
    } catch (err) {
      payment.refundRequired = true;
      payment.reconcileNote =
        err instanceof Error ? err.message : "Booking confirmation failed";
      await payment.save();

      console.error(
        `payment ${payment._id.toString()} captured but booking ${payment.booking.toString()} could not be confirmed: ${payment.reconcileNote}`,
      );

      throw new ApiError(
        409,
        "Your payment went through but the reservation could no longer be held. It has been flagged for a refund.",
      );
    }
  }

  /**
   * Verify a Khalti payment via server-side lookup and confirm the booking.
   * Returns the bookingId and whether it ended up confirmed.
   */
  public async verifyKhalti(
    pidx: string,
  ): Promise<{ bookingId: string; confirmed: boolean }> {
    const payment = await Payment.findOne({ pidx });
    if (!payment) {
      throw new ApiError(404, "Payment record not found for this pidx");
    }

    // Callbacks get retried, and payers refresh the return URL. Re-running the
    // whole flow on a settled payment costs a provider round trip and, if the
    // booking has since changed state, reports a failure for money we kept.
    if (payment.status === "completed") {
      return { bookingId: payment.booking.toString(), confirmed: true };
    }

    const lookup = await khaltiLookup(pidx);
    payment.raw = lookup;

    if (lookup.status !== "Completed") {
      payment.status = KHALTI_TERMINAL_FAILURES.has(lookup.status)
        ? "failed"
        : "initiated";
      await payment.save();
      return { bookingId: payment.booking.toString(), confirmed: false };
    }

    // guard against amount tampering
    const expectedPaisa = Math.round(payment.amount * 100);
    if (lookup.total_amount !== expectedPaisa) {
      payment.status = "failed";
      payment.reconcileNote = `Khalti settled ${lookup.total_amount} paisa, expected ${expectedPaisa}`;
      // Money changed hands for the wrong amount — that needs a human, not
      // just a rejected callback.
      payment.refundRequired = true;
      await payment.save();
      throw new ApiError(400, "Paid amount does not match the booking total");
    }

    payment.status = "completed";
    if (lookup.transaction_id) payment.providerRef = lookup.transaction_id;
    await payment.save();

    await this.confirmPaidBooking(payment, lookup.transaction_id || pidx);

    return { bookingId: payment.booking.toString(), confirmed: true };
  }

  /**
   * Verify an eSewa callback: check the signature, re-verify against the
   * status API, then confirm the booking.
   */
  public async verifyEsewa(
    base64Data: string,
  ): Promise<{ bookingId: string; confirmed: boolean }> {
    const data = esewaDecodeCallback(base64Data);

    if (!esewaVerifyCallbackSignature(data)) {
      throw new ApiError(400, "Invalid eSewa signature");
    }

    const payment = await Payment.findOne({
      transactionUuid: data.transaction_uuid,
    });
    if (!payment) {
      throw new ApiError(404, "Payment record not found for this transaction");
    }

    if (payment.status === "completed") {
      return { bookingId: payment.booking.toString(), confirmed: true };
    }

    // authoritative server-to-server status check
    const status = await esewaCheckStatus({
      totalAmount: payment.amount,
      transactionUuid: data.transaction_uuid,
    });
    payment.raw = status;

    if (status.status !== "COMPLETE") {
      // PENDING and AMBIGUOUS are not verdicts — eSewa is still settling, and
      // burning the record as failed means the eventual settlement is lost.
      payment.status =
        status.status === "PENDING" || status.status === "AMBIGUOUS"
          ? "initiated"
          : "failed";
      await payment.save();
      return { bookingId: payment.booking.toString(), confirmed: false };
    }

    const paid = esewaParseAmount(status.total_amount);
    if (!esewaAmountsMatch(paid, payment.amount)) {
      payment.status = "failed";
      payment.reconcileNote = `eSewa settled ${String(status.total_amount)}, expected ${payment.amount}`;
      payment.refundRequired = true;
      await payment.save();
      throw new ApiError(400, "Paid amount does not match the booking total");
    }

    payment.status = "completed";
    if (status.ref_id) payment.providerRef = status.ref_id;
    await payment.save();

    await this.confirmPaidBooking(
      payment,
      status.ref_id || data.transaction_uuid,
    );

    return { bookingId: payment.booking.toString(), confirmed: true };
  }
}

export const paymentService = new PaymentService();
