import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(8000),

    // database
    MONGO_URI: z.string().min(1, "MONGO_URI is required"),

    // auth secrets
    ACCESS_TOKEN_SECRET: z.string().min(1, "ACCESS_TOKEN_SECRET is required"),
    REFRESH_TOKEN_SECRET: z.string().min(1, "REFRESH_TOKEN_SECRET is required"),
    TOKEN_HASH_SECRET: z.string().min(1, "TOKEN_HASH_SECRET is required"),

    // urls
    CLIENT_URL: z.string().url().optional(),
    SERVER_URL: z.string().url().optional(),
    CORS_ORIGINS: z.string().optional(),

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
  .passthrough()
  .superRefine((cfg, ctx) => {
    // Access and refresh tokens are told apart by which secret verifies them.
    // If any two secrets are the same value, a token minted for one purpose
    // verifies for the other, and the `type` claim is the only thing left
    // standing between an access token and a refresh token.
    const secrets = [
      ["ACCESS_TOKEN_SECRET", cfg.ACCESS_TOKEN_SECRET],
      ["REFRESH_TOKEN_SECRET", cfg.REFRESH_TOKEN_SECRET],
      ["TOKEN_HASH_SECRET", cfg.TOKEN_HASH_SECRET],
    ] as const;

    for (let i = 0; i < secrets.length; i++) {
      for (let j = i + 1; j < secrets.length; j++) {
        const first = secrets[i]!;
        const second = secrets[j]!;
        if (first[1] === second[1]) {
          ctx.addIssue({
            code: "custom",
            path: [second[0]],
            message: `${second[0]} must be different from ${first[0]}`,
          });
        }
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Refusing to boot beats failing with a cryptic error deep inside a request
  // handler the first time someone hits an endpoint that needs the value.
  console.error(
    "❌ Invalid environment configuration:",
    parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  );
  process.exit(1);
}

export const env = parsed.data;

for (const name of [
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "TOKEN_HASH_SECRET",
] as const) {
  if (env[name].length < 32) {
    console.warn(
      `⚠️  ${name} is only ${env[name].length} characters. Use at least 32 random characters before deploying.`,
    );
  }
}

export type Env = z.infer<typeof envSchema>;
