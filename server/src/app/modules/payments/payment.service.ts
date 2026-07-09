import { Payment, type IPayment } from "./payment.model";
import { Booking } from "../bookings/booking.model";
import { bookingService } from "../bookings/booking.service";
import { ApiError } from "../../utils/ApiError";
import {
  khaltiInitiate,
  khaltiLookup,
  type KhaltiInitiateResponse,
} from "../../libs/khalti";
import {
  esewaBuildForm,
  esewaDecodeCallback,
  esewaVerifyCallbackSignature,
  esewaCheckStatus,
  type EsewaFormPayload,
} from "../../libs/esewa";

const SERVER_URL = (
  process.env.SERVER_URL || "http://localhost:8000"
).replace(/\/$/, "");
const CLIENT_URL = (
  process.env.CLIENT_URL || "http://localhost:3000"
).replace(/\/$/, "");

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

    const payment = await Payment.create({
      booking: booking._id,
      user: booking.user,
      provider,
      amount: booking.totalAmount,
      currency: booking.currency || "NPR",
      status: "initiated",
    });

    if (provider === "khalti") {
      let khaltiRes: KhaltiInitiateResponse;
      try {
        khaltiRes = await khaltiInitiate({
          returnUrl: `${SERVER_URL}/api/v1/payments/khalti/callback`,
          websiteUrl: CLIENT_URL,
          amountPaisa: Math.round(booking.totalAmount * 100),
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

    const form = esewaBuildForm({
      amount: booking.totalAmount,
      transactionUuid,
      successUrl: `${SERVER_URL}/api/v1/payments/esewa/callback`,
      failureUrl: `${CLIENT_URL}/payment/failure?bookingId=${booking._id.toString()}`,
    });

    return {
      provider: "esewa",
      paymentId: payment._id.toString(),
      ...form,
    };
  }

  private async markFailed(payment: IPayment, err: unknown) {
    payment.status = "failed";
    payment.raw = err instanceof Error ? { error: err.message } : err;
    await payment.save();
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

    const lookup = await khaltiLookup(pidx);
    payment.raw = lookup;

    if (lookup.status !== "Completed") {
      payment.status = "failed";
      await payment.save();
      return { bookingId: payment.booking.toString(), confirmed: false };
    }

    // guard against amount tampering
    const expectedPaisa = Math.round(payment.amount * 100);
    if (lookup.total_amount !== expectedPaisa) {
      payment.status = "failed";
      await payment.save();
      throw new ApiError(400, "Paid amount does not match the booking total");
    }

    payment.status = "completed";
    if (lookup.transaction_id) payment.providerRef = lookup.transaction_id;
    await payment.save();

    await bookingService.confirmBooking(payment.booking, {
      paymentIntentId: lookup.transaction_id || pidx,
    });

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

    // authoritative server-to-server status check
    const status = await esewaCheckStatus({
      totalAmount: payment.amount,
      transactionUuid: data.transaction_uuid,
    });
    payment.raw = status;

    if (status.status !== "COMPLETE") {
      payment.status = "failed";
      await payment.save();
      return { bookingId: payment.booking.toString(), confirmed: false };
    }

    if (Number(status.total_amount) !== payment.amount) {
      payment.status = "failed";
      await payment.save();
      throw new ApiError(400, "Paid amount does not match the booking total");
    }

    payment.status = "completed";
    if (status.ref_id) payment.providerRef = status.ref_id;
    await payment.save();

    await bookingService.confirmBooking(payment.booking, {
      paymentIntentId: status.ref_id || data.transaction_uuid,
    });

    return { bookingId: payment.booking.toString(), confirmed: true };
  }
}

export const paymentService = new PaymentService();
