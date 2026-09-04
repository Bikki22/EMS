import mongoose, { Document, Schema, Types, model } from "mongoose";

export type PaymentProvider = "khalti" | "esewa";
export type PaymentStatus = "initiated" | "completed" | "failed";

export interface IPayment extends Document {
  _id: Types.ObjectId;
  booking: Types.ObjectId;
  user: Types.ObjectId;
  provider: PaymentProvider;
  amount: number; // NPR rupees
  currency: string;
  status: PaymentStatus;
  pidx?: string; // khalti payment identifier
  transactionUuid?: string; // esewa transaction uuid
  providerRef?: string; // khalti transaction_id / esewa ref_id
  // When the provider-side checkout session stops being usable. Lets initiate
  // hand back a live session instead of opening a second one for the same
  // booking, which is how a payer ends up with two chargeable checkouts.
  providerExpiresAt?: Date;
  // Set when the money was captured but the booking could not be confirmed
  // (the seat hold lapsed, the booking was cancelled). Without it that payer
  // is owed a refund and nothing records it.
  refundRequired: boolean;
  reconcileNote?: string;
  raw?: unknown; // last raw provider response (for auditing)
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["khalti", "esewa"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NPR" },
    status: {
      type: String,
      enum: ["initiated", "completed", "failed"],
      default: "initiated",
      index: true,
    },
    pidx: { type: String, index: true },
    transactionUuid: { type: String, index: true },
    providerRef: { type: String },
    providerExpiresAt: { type: Date },
    refundRequired: { type: Boolean, default: false, index: true },
    reconcileNote: { type: String },
    raw: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

// initiate looks up "is there already a live/settled payment for this booking".
paymentSchema.index({ booking: 1, status: 1 });

export const Payment = model<IPayment>("Payment", paymentSchema);
export { mongoose };
