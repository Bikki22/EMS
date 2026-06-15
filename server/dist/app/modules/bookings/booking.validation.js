"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelBookingSchema = exports.createBookingSchema = void 0;
const zod_1 = require("zod");
exports.createBookingSchema = zod_1.z.object({
    eventId: zod_1.z.string().min(1, "Event Id is required"),
    items: zod_1.z
        .array(zod_1.z.object({
        ticketTypeId: zod_1.z.string().min(1, "Ticket Type Id is requried"),
        quantity: zod_1.z.number().int().min(1, "Quantity must be at least 1"),
    }))
        .min(1, "At least one ticket item is requried"),
});
exports.cancelBookingSchema = zod_1.z.object({
    reason: zod_1.z.string().max(500).optional(),
});
//# sourceMappingURL=booking.validation.js.map