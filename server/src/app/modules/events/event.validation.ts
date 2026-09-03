import { z } from "zod";

const ticketTypeSchema = z
  .object({
    // Present when the client is editing a ticket type that already exists.
    // Preserving it is what keeps existing bookings pointing at a real ticket
    // type — see EventService.mergeTicketTypes.
    _id: z.string().optional(),
    name: z.string().min(1, "Ticket name is required"),
    description: z.string(),
    // 0 is allowed: free events are a first-class path in the bookings module,
    // which confirms a zero-total booking immediately instead of charging.
    price: z.number().min(0, "Price cannot be negative"),
    currency: z
      .string()
      .length(3, "Currency must be 3 characters")
      .default("USD"),
    totalQuantity: z.number().int().min(1, "Quantity must be at least 1"),
    maxPerBooking: z
      .number()
      .int()
      .min(1, "Max per booking must be at least 1")
      .default(10),
    salesStartAt: z.coerce.date(),
    salesEndAt: z.coerce.date(),
  })
  .refine((d) => d.salesEndAt > d.salesStartAt, {
    message: "salesEndAt must be after salesStartAt",
    path: ["salesEndAt"],
  });

const locationSchema = z
  .object({
    type: z.enum(["online", "physical"]),
    url: z.string().url().optional(),
    platform: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
  })
  .refine(
    (d) => {
      if (d.type === "online") return !!d.url;
      if (d.type === "physical") return !!d.address && !!d.city && !!d.country;
      return true;
    },
    {
      message:
        "Online events require url. Physical events require address, city, country.",
    },
  );

const eventBaseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  tags: z.array(z.string()),
  location: locationSchema,
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  ticketTypes: z
    .array(ticketTypeSchema)
    .min(1, "At least one ticket type is required"),
  bannerUrl: z.string().url(),
});

export const createEventSchema = eventBaseSchema.refine(
  (d) => d.endsAt > d.startsAt,
  {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  },
);

// Updates are partial. Requiring the full create payload meant every edit —
// even a title change — resent `ticketTypes`, and rebuilding that array reset
// sold seats and re-issued subdocument _ids, orphaning existing bookings.
export const updateEventSchema = eventBaseSchema.partial().refine(
  (d) => !d.startsAt || !d.endsAt || d.endsAt > d.startsAt,
  {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  },
);

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type TicketTypeInput = z.infer<typeof ticketTypeSchema>;

// Every filter is optional — an unfiltered `GET /api/v1/events` is the most
// common call, and required fields here made it fail validation with a 400.
//
// The preprocess drops keys whose value is "", which is what a client sends
// for `?city=&status=`. Left in place, an empty string fails the enum and date
// filters even though the caller meant "no filter".
export const eventFiltersSchema = z.preprocess(
  (raw) => {
    if (!raw || typeof raw !== "object") return raw;

    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>).filter(
        ([, value]) => value !== "",
      ),
    );
  },
  z.object({
    category: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    locationType: z.enum(["online", "physical"]).optional(),
    startFrom: z.coerce.date().optional(),
    startTo: z.coerce.date().optional(),
    search: z.string().optional(),
    status: z.enum(["draft", "published", "cancelled"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sortBy: z.enum(["startsAt", "createdAt", "title"]).default("startsAt"),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
  }),
);

export const publishEventSchema = z.object({
  status: z.enum(["draft", "published", "cancelled"]),
});
