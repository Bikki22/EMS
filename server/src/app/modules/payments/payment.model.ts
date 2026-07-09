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
    raw: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const Payment = model<IPayment>("Payment", paymentSchema);
export { mongoose };
