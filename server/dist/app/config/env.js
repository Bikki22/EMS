"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const envSchema = zod_1.z
    .object({
    NODE_ENV: zod_1.z
        .enum(["development", "production", "test"])
        .default("development"),
    PORT: zod_1.z.coerce.number().int().positive().default(8000),
    // database
    MONGO_URI: zod_1.z.string().min(1, "MONGO_URI is required"),
    // auth secrets
    ACCESS_TOKEN_SECRET: zod_1.z.string().min(1, "ACCESS_TOKEN_SECRET is required"),
    REFRESH_TOKEN_SECRET: zod_1.z.string().min(1, "REFRESH_TOKEN_SECRET is required"),
    TOKEN_HASH_SECRET: zod_1.z.string().min(1, "TOKEN_HASH_SECRET is required"),
    // urls
    CLIENT_URL: zod_1.z.string().url().optional(),
    SERVER_URL: zod_1.z.string().url().optional(),
    CORS_ORIGINS: zod_1.z.string().optional(),
    // email (optional — verification/reset emails degrade gracefully)
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.coerce.number().optional(),
    SMTP_SECURE: zod_1.z.string().optional(),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    EMAIL_FROM_NAME: zod_1.z.string().optional(),
    EMAIL_FROM_ADDRESS: zod_1.z.string().optional(),
    // payment providers (optional — required only when that provider is used)
    KHALTI_BASE_URL: zod_1.z.string().url().optional(),
    KHALTI_SECRET_KEY: zod_1.z.string().optional(),
    ESEWA_FORM_URL: zod_1.z.string().url().optional(),
    ESEWA_STATUS_URL: zod_1.z.string().url().optional(),
    ESEWA_PRODUCT_CODE: zod_1.z.string().optional(),
    ESEWA_SECRET_KEY: zod_1.z.string().optional(),
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
    ];
    for (let i = 0; i < secrets.length; i++) {
        for (let j = i + 1; j < secrets.length; j++) {
            const first = secrets[i];
            const second = secrets[j];
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
    console.error("❌ Invalid environment configuration:", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
    process.exit(1);
}
exports.env = parsed.data;
for (const name of [
    "ACCESS_TOKEN_SECRET",
    "REFRESH_TOKEN_SECRET",
    "TOKEN_HASH_SECRET",
]) {
    if (exports.env[name].length < 32) {
        console.warn(`⚠️  ${name} is only ${exports.env[name].length} characters. Use at least 32 random characters before deploying.`);
    }
}
//# sourceMappingURL=env.js.map