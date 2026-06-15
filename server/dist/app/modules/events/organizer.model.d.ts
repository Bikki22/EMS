import mongoose, { Document, Types } from "mongoose";
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
export declare const Organizer: mongoose.Model<IOrganizer, {}, {}, {}, mongoose.Document<unknown, {}, IOrganizer, {}, mongoose.DefaultSchemaOptions> & IOrganizer & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IOrganizer>;
//# sourceMappingURL=organizer.model.d.ts.map