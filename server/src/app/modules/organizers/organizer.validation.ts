import { z } from "zod";

// People type "example.com", not "https://example.com". Assume https when no
// scheme is given rather than failing a URL that is obviously fine, but still
// reject anything that isn't a real URL once normalized.
const url = (message: string) =>
  z
    .string()
    .trim()
    .transform((value) =>
      value === "" || /^https?:\/\//i.test(value) ? value : `https://${value}`,
    )
    .pipe(z.string().url(message));

export const createOrganizerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Organizer name must be at least 2 characters"),
  bio: z.string().trim().max(1000).optional(),
  website: url("Website must be a valid URL").optional(),
  logoUrl: url("Logo must be a valid URL").optional(),
});

// A PATCH that sets nothing is a client bug, not a successful update — the
// old schema accepted `{}` and cheerfully answered "Organizer profile updated".
export const updateOrganizerSchema = createOrganizerSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export type CreateOrganizerInput = z.infer<typeof createOrganizerSchema>;
export type UpdateOrganizerInput = z.infer<typeof updateOrganizerSchema>;
