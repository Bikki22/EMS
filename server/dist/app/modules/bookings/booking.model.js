"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Booking = void 0;
const mongoose_1 = require("mongoose");
const bookingItemSchema = new mongoose_1.Schema({
    ticketTypeId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
    },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
}, { _id: false });
const bookingSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "user",
        requried: true,
    },
    event: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Event",
        required: true,
    },
    organization: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
    },
    items: {
        type: [bookingItemSchema],
        required: true,
        validate: {
            validator: (v) => v.length > 0,
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
}, {
    timestamps: true,
});
bookingSchema.index({ user: 1 });
bookingSchema.index({ event: 1 });
bookingSchema.index({ organization: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ paymentIntentId: 1 });
bookingSchema.index({ status: 1, expiresAt: 1 }); // for cron expiry job
exports.Booking = (0, mongoose_1.model)("Booking", bookingSchema);
//# sourceMappingURL=booking.model.js.map