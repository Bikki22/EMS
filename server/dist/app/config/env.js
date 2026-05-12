"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z
        .enum(["development", "production", "test"])
        .default("development"),
    DATABASE_URL: zod_1.z.string().url(),
});
const parsed = envSchema.safeParse(process.env);
exports.env = parsed.data;
//# sourceMappingURL=env.js.map