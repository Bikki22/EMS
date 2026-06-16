import mongoose, { Document, Types } from "mongoose";
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
export declare const Booking: mongoose.Model<IBooking, {}, {}, {}, mongoose.Document<unknown, {}, IBooking, {}, mongoose.DefaultSchemaOptions> & IBooking & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IBooking>;
export {};
//# sourceMappingURL=booking.model.d.ts.map