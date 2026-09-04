import { Document, Schema, Types, model } from "mongoose";

export const TICKET_STATUSES = ["active", "used", "cancelled"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export interface ITicket extends Document {
  _id: Types.ObjectId;
  booking: Types.ObjectId;
  event: Types.ObjectId;
  user: Types.ObjectId;
  ticketTypeId: Types.ObjectId;
  ticketName: string;
  qrToken: string;
  // A transfer reassigns `user` in place, so a ticket stays "active" and the
  // recipient can check it in. There is no "transferred" status: the ticket
  // itself is never retired, only its owner changes.
  status: TicketStatus;
  checkedInAt?: Date;
  checkedInBy?: Types.ObjectId;
  // Original issuee, set the first time the ticket changes hands and never
  // overwritten, so a chain of transfers still points back to the buyer.
  originalOwner?: Types.ObjectId;
  transferredFrom?: Types.ObjectId;
  transferredAt?: Date;
  transferCount: number;
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
      // `unique` builds the index on its own; declaring it again below made
      // Mongoose warn about a duplicate schema index at boot.
      unique: true,
      select: false,
    },
    status: {
      type: String,
      enum: TICKET_STATUSES,
      default: "active",
    },
    checkedInAt: {
      type: Date,
    },
    checkedInBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    originalOwner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    transferredFrom: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    transferredAt: {
      type: Date,
    },
    transferCount: {
      type: Number,
      default: 0,
      min: 0,
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
ticketSchema.index({ status: 1 });
ticketSchema.index({ event: 1, status: 1 });
ticketSchema.index({ user: 1, event: 1 });

export const Ticket = model<ITicket>("Ticket", ticketSchema);
