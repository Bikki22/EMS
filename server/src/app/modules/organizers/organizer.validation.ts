import { z } from "zod";

export const createOrganizerSchema = z.object({
  name: z.string().min(2, "Organizer name must be at least 2 characters"),
  bio: z.string().max(1000).optional(),
  website: z.string().url("Website must be a valid URL").optional(),
  logoUrl: z.string().url("Logo must be a valid URL").optional(),
});

export const updateOrganizerSchema = createOrganizerSchema.partial();

export type CreateOrganizerInput = z.infer<typeof createOrganizerSchema>;
export type UpdateOrganizerInput = z.infer<typeof updateOrganizerSchema>;
