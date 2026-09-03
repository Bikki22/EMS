import mongoose, { Document, Types } from "mongoose";
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
export declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUser>;
export {};
//# sourceMappingURL=auth.model.d.ts.map