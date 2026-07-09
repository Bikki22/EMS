import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),

    // database
    MONGO_URI: z.string().min(1, "MONGO_URI is required"),

    // auth secrets
    ACCESS_TOKEN_SECRET: z.string().min(1, "ACCESS_TOKEN_SECRET is required"),
    REFRESH_TOKEN_SECRET: z.string().min(1, "REFRESH_TOKEN_SECRET is required"),
    TOKEN_HASH_SECRET: z.string().min(1, "TOKEN_HASH_SECRET is required"),

    // urls
    CLIENT_URL: z.string().url().optional(),
    SERVER_URL: z.string().url().optional(),

    // email (optional — verification/reset emails degrade gracefully)
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_SECURE: z.string().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM_NAME: z.string().optional(),
    EMAIL_FROM_ADDRESS: z.string().optional(),

    // payment providers (optional — required only when that provider is used)
    KHALTI_BASE_URL: z.string().url().optional(),
    KHALTI_SECRET_KEY: z.string().optional(),
    ESEWA_FORM_URL: z.string().url().optional(),
    ESEWA_STATUS_URL: z.string().url().optional(),
    ESEWA_PRODUCT_CODE: z.string().optional(),
    ESEWA_SECRET_KEY: z.string().optional(),
  })
  .passthrough();

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Surface misconfiguration loudly rather than failing with cryptic runtime
  // errors deep in a request handler.
  console.error(
    "❌ Invalid environment configuration:",
    parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  );
}

export const env = parsed.success ? parsed.data : undefined;
export type Env = z.infer<typeof envSchema>;
