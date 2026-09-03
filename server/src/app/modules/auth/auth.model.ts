import mongoose, { Document, model, Types } from "mongoose";

interface ISocialIdentity {
  provider: string;
  providerUserId: string;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  /** Legacy HMAC-SHA256 accounts only — bcrypt embeds its own salt. */
  salt?: string | undefined;
  isVerified: boolean;
  verificationToken?: string | undefined;
  verificationTokenExpiresAt?: Date | undefined;
  passwordResetToken?: string | undefined;
  passwordResetTokenExpiresAt?: Date | undefined;
  refreshToken: string | null;
  refreshTokenFamily: string | null;
  previousRefreshToken: string | null;
  previousRefreshTokenExpiresAt: Date | null;
  socialIdentities: ISocialIdentity[];
  avatarUrl: string | null;
  phone: string;
  status: "active" | "suspended" | "deleted";
  roles: "user" | "org_owner" | "admin";
  lastLogin: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    firstName: {
      type: String,
      trim: true,
      minLength: [3, "Name must be more than 3 characters"],
      required: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      minLength: [6, "Password must be at least 6 characters"],
      required: true,
      select: false,
    },
    // Only ever set on legacy HMAC-SHA256 accounts, and unset once the user
    // next logs in and the password is rehashed with bcrypt.
    salt: {
      type: String,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      select: false,
    },
    verificationTokenExpiresAt: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetTokenExpiresAt: {
      type: Date,
      select: false,
    },
    refreshToken: {
      type: String,
      default: null,
      select: false,
    },
    refreshTokenFamily: {
      type: String,
      default: null,
      select: false,
    },
    // A rotated refresh token stays usable for a short grace window so that
    // two tabs refreshing at the same instant don't knock each other out.
    previousRefreshToken: {
      type: String,
      default: null,
      select: false,
    },
    previousRefreshTokenExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    socialIdentities: [
      {
        provider: { type: String, required: true },
        providerUserId: { type: String, required: true },
      },
    ],
    roles: {
      type: String,
      enum: ["user", "org_owner", "admin"],
      default: "user",
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "deleted"],
      default: "active",
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// email and phone already declare `unique: true` on the field, which builds the
// index. Repeating it here made Mongoose log a duplicate-index warning on boot.

export const User = model<IUser>("User", userSchema);
