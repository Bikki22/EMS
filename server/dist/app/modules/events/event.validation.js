"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishEventSchema = exports.eventFiltersSchema = exports.updateEventSchema = exports.createEventSchema = void 0;
const zod_1 = require("zod");
const ticketTypeSchema = zod_1.z
    .object({
    // Present when the client is editing a ticket type that already exists.
    // Preserving it is what keeps existing bookings pointing at a real ticket
    // type — see EventService.mergeTicketTypes.
    _id: zod_1.z.string().optional(),
    name: zod_1.z.string().min(1, "Ticket name is required"),
    description: zod_1.z.string(),
    // 0 is allowed: free events are a first-class path in the bookings module,
    // which confirms a zero-total booking immediately instead of charging.
    price: zod_1.z.number().min(0, "Price cannot be negative"),
    currency: zod_1.z
        .string()
        .length(3, "Currency must be 3 characters")
        .default("USD"),
    totalQuantity: zod_1.z.number().int().min(1, "Quantity must be at least 1"),
    maxPerBooking: zod_1.z
        .number()
        .int()
        .min(1, "Max per booking must be at least 1")
        .default(10),
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
const eventBaseSchema = zod_1.z.object({
    title: zod_1.z.string().min(3, "Title must be at least 3 characters"),
    description: zod_1.z.string().min(10, "Description must be at least 10 characters"),
    category: zod_1.z.string().min(1, "Category is required"),
    tags: zod_1.z.array(zod_1.z.string()),
    location: locationSchema,
    startsAt: zod_1.z.coerce.date(),
    endsAt: zod_1.z.coerce.date(),
    ticketTypes: zod_1.z
        .array(ticketTypeSchema)
        .min(1, "At least one ticket type is required"),
    bannerUrl: zod_1.z.string().url(),
});
exports.createEventSchema = eventBaseSchema.refine((d) => d.endsAt > d.startsAt, {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
});
// Updates are partial. Requiring the full create payload meant every edit —
// even a title change — resent `ticketTypes`, and rebuilding that array reset
// sold seats and re-issued subdocument _ids, orphaning existing bookings.
exports.updateEventSchema = eventBaseSchema.partial().refine((d) => !d.startsAt || !d.endsAt || d.endsAt > d.startsAt, {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
});
// Every filter is optional — an unfiltered `GET /api/v1/events` is the most
// common call, and required fields here made it fail validation with a 400.
//
// The preprocess drops keys whose value is "", which is what a client sends
// for `?city=&status=`. Left in place, an empty string fails the enum and date
// filters even though the caller meant "no filter".
exports.eventFiltersSchema = zod_1.z.preprocess((raw) => {
    if (!raw || typeof raw !== "object")
        return raw;
    return Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== ""));
}, zod_1.z.object({
    category: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    country: zod_1.z.string().optional(),
    locationType: zod_1.z.enum(["online", "physical"]).optional(),
    startFrom: zod_1.z.coerce.date().optional(),
    startTo: zod_1.z.coerce.date().optional(),
    search: zod_1.z.string().optional(),
    status: zod_1.z.enum(["draft", "published", "cancelled"]).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(10),
    sortBy: zod_1.z.enum(["startsAt", "createdAt", "title"]).default("startsAt"),
    sortOrder: zod_1.z.enum(["asc", "desc"]).default("asc"),
}));
exports.publishEventSchema = zod_1.z.object({
    status: zod_1.z.enum(["draft", "published", "cancelled"]),
});
//# sourceMappingURL=event.validation.js.map