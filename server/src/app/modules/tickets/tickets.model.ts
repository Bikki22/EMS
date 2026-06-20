import mongoose, { Document, Schema, Types, model } from "mongoose";

export interface ITicket extends Document {
  _id: Types.ObjectId;
  booking: Types.ObjectId;
  event: Types.ObjectId;
  user: Types.ObjectId;
  ticketTypeId: Types.ObjectId;
  ticketName: string;
  qrToken: string;
  status: "active" | "used" | "cancelled" | "transferred";
  checkedInAt?: Date;
  checkedInBy?: Types.ObjectId;
  transferredTo?: Types.ObjectId;
  transferredAt?: Date;
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Booking is required"],
    },
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Event is required"],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    ticketTypeId: {
      type: Schema.Types.ObjectId,
      required: [true, "Ticket type is required"],
    },
    ticketName: {
      type: String,
      required: [true, "Ticket name is required"],
      trim: true,
    },
    qrToken: {
      type: String,
      required: [true, "QR token is required"],
      unique: true,
      select: false,
    },
    status: {
      type: String,
      enum: ["active", "used", "cancelled", "transferred"],
      default: "active",
    },
    checkedInAt: {
      type: Date,
    },
    checkedInBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    transferredTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    transferredAt: {
      type: Date,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

ticketSchema.index({ booking: 1 });
ticketSchema.index({ event: 1 });
ticketSchema.index({ user: 1 });
ticketSchema.index({ qrToken: 1 }, { unique: true });
ticketSchema.index({ status: 1 });
ticketSchema.index({ event: 1, status: 1 });
ticketSchema.index({ user: 1, event: 1 });

export const Ticket = model<ITicket>("Ticket", ticketSchema);
