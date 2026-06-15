import mongoose, { Document, Types } from "mongoose";
export interface ITicketType {
    _id?: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    totalQuantity: number;
    availableQuantity: number;
    quantitySold: number;
    maxPerBooking?: number;
    salesStartAt?: Date | undefined;
    salesEndAt?: Date | undefined;
    isActive: boolean;
}
export interface IEventLocation {
    type: "online" | "physical";
    url?: string;
    platform?: string;
    address?: string;
    city?: string;
    country?: string;
}
export interface IEvent extends Document {
    _id: Types.ObjectId;
    title: string;
    slug: string;
    description: string;
    category: string;
    tags: string[];
    organizer: Types.ObjectId;
    location: IEventLocation;
    startsAt: Date;
    endsAt: Date;
    ticketTypes: ITicketType[];
    bannerUrl: string | null;
    status: "draft" | "published" | "cancelled";
    totalCapacity: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Event: mongoose.Model<IEvent, {}, {}, {}, mongoose.Document<unknown, {}, IEvent, {}, mongoose.DefaultSchemaOptions> & IEvent & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IEvent>;
//# sourceMappingURL=event.model.d.ts.map