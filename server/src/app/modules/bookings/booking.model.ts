import mongoose, { Document, Schema, Types, model } from "mongoose";

interface IBookingItem {
  ticketTypeId: Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface IBooking extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  event: Types.ObjectId;
  organization: Types.ObjectId;
  items: IBookingItem[];
  totalAmount: number;
  currency: string;
  status: "Pending" | "Confirmed" | "Cancelled" | "Refunded" | "Expired";
  paymentIntentId?: string;
  expiresAt?: Date | undefined;
  confirmedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bookingItemSchema = new Schema<IBookingItem>(
  {
    ticketTypeId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const bookingSchema = new Schema<IBooking>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "user",
      requried: true,
    },
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    items: {
      type: [bookingItemSchema],
      required: true,
      validate: {
        validator: (v: IBookingItem[]) => v.length > 0,
        message: "Booking must be at least one item",
      },
    },

    totalAmount: {
      type: Number,
      requried: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
    },
    status: {
      type: String,
      enum: ["pending", "Conifirmed", "Cancelled", "Refunded", "Expired"],
      default: "Pending",
    },
    paymentIntentId: {
      type: String,
    },
    expiresAt: {
      type: Date,
    },
    confirmedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancelReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

bookingSchema.index({ user: 1 });
bookingSchema.index({ event: 1 });
bookingSchema.index({ organization: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ paymentIntentId: 1 });
bookingSchema.index({ status: 1, expiresAt: 1 }); // for cron expiry job

export const Booking = model<IBooking>("Booking", bookingSchema);
