import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE_URL: z.string().url(),
});

const parsed = envSchema.safeParse(process.env);

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
