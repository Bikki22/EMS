import mongoose, { Document, model, Types } from "mongoose";

export interface IOrganizer extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  bio?: string;
  website?: string;
  logoUrl: string | null;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const organizerSchema = new mongoose.Schema<IOrganizer>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    bio: { type: String, trim: true },
    website: { type: String, trim: true },
    logoUrl: { type: String, default: null },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Organizer = model<IOrganizer>("Organizer", organizerSchema);
