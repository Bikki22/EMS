import { z } from "zod";

const ticketTypeSchema = z
  .object({
    name: z.string().min(1, "Ticket name is required"),
    description: z.string(),
    price: z.number().min(0.01, "Price must be greater than 0"),
    currency: z
      .string()
      .length(3, "Currency must be 3 characters")
      .default("USD"),
    totalQuantity: z.number().int().min(1, "Quantity must be at least 1"),
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

export const createEventSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters"),
    category: z.string().min(1, "Category is required"),
    tags: z.array(z.string()),
    location: locationSchema,
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    ticketTypes: z
      .array(ticketTypeSchema)
      .min(1, "At least one ticket type is required"),
    bannerUrl: z.string().url(),
  })
  .refine((d) => d.endsAt > d.startsAt, {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  });

export const updateEventSchema = createEventSchema;

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const eventFiltersSchema = z.object({
  category: z.string(),
  city: z.string(),
  country: z.string(),
  locationType: z.enum(["online", "physical"]),
  startFrom: z.coerce.date(),
  startTo: z.coerce.date(),
  search: z.string(),
  status: z.enum(["draft", "published", "cancelled"]),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(["startsAt", "createdAt", "title"]).default("startsAt"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export const publishEventSchema = z.object({
  status: z.enum(["published", "cancelled"]),
});
