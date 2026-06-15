"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishEventSchema = exports.eventFiltersSchema = exports.updateEventSchema = exports.createEventSchema = void 0;
const zod_1 = require("zod");
const ticketTypeSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1, "Ticket name is required"),
    description: zod_1.z.string(),
    price: zod_1.z.number().min(0.01, "Price must be greater than 0"),
    currency: zod_1.z
        .string()
        .length(3, "Currency must be 3 characters")
        .default("USD"),
    totalQuantity: zod_1.z.number().int().min(1, "Quantity must be at least 1"),
    salesStartAt: zod_1.z.coerce.date(),
    salesEndAt: zod_1.z.coerce.date(),
})
    .refine((d) => d.salesEndAt > d.salesStartAt, {
    message: "salesEndAt must be after salesStartAt",
    path: ["salesEndAt"],
});
const locationSchema = zod_1.z
    .object({
    type: zod_1.z.enum(["online", "physical"]),
    url: zod_1.z.string().url().optional(),
    platform: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    country: zod_1.z.string().optional(),
})
    .refine((d) => {
    if (d.type === "online")
        return !!d.url;
    if (d.type === "physical")
        return !!d.address && !!d.city && !!d.country;
    return true;
}, {
    message: "Online events require url. Physical events require address, city, country.",
});
exports.createEventSchema = zod_1.z
    .object({
    title: zod_1.z.string().min(3, "Title must be at least 3 characters"),
    description: zod_1.z
        .string()
        .min(10, "Description must be at least 10 characters"),
    category: zod_1.z.string().min(1, "Category is required"),
    tags: zod_1.z.array(zod_1.z.string()),
    location: locationSchema,
    startsAt: zod_1.z.coerce.date(),
    endsAt: zod_1.z.coerce.date(),
    ticketTypes: zod_1.z
        .array(ticketTypeSchema)
        .min(1, "At least one ticket type is required"),
    bannerUrl: zod_1.z.string().url(),
})
    .refine((d) => d.endsAt > d.startsAt, {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
});
exports.updateEventSchema = exports.createEventSchema;
exports.eventFiltersSchema = zod_1.z.object({
    category: zod_1.z.string(),
    city: zod_1.z.string(),
    country: zod_1.z.string(),
    locationType: zod_1.z.enum(["online", "physical"]),
    startFrom: zod_1.z.coerce.date(),
    startTo: zod_1.z.coerce.date(),
    search: zod_1.z.string(),
    status: zod_1.z.enum(["draft", "published", "cancelled"]),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(10),
    sortBy: zod_1.z.enum(["startsAt", "createdAt", "title"]).default("startsAt"),
    sortOrder: zod_1.z.enum(["asc", "desc"]).default("asc"),
});
exports.publishEventSchema = zod_1.z.object({
    status: zod_1.z.enum(["published", "cancelled"]),
});
//# sourceMappingURL=event.validation.js.map