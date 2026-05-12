import mongoose, { Document, Types } from "mongoose";
export interface IUser extends Document {
    _id: Types.ObjectId;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    emailVerified: Date | null;
    socialIdentities: Array<{
        provider: string;
        providerUserId: string;
    }>;
    avatarUrl: string | null;
    phone: string | null;
    status: "active" | "suspended" | "deleted";
    roles: "user" | "org_owner" | "admin";
    lastLogin: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
export declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUser>;
//# sourceMappingURL=auth.model.d.ts.map