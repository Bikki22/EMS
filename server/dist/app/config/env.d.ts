import { z } from "zod";
declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<{
        development: "development";
        production: "production";
        test: "test";
    }>>;
    DATABASE_URL: z.ZodString;
}, z.core.$strip>;
export declare const env: {
    NODE_ENV: "development" | "production" | "test";
    DATABASE_URL: string;
} | undefined;
export type Env = z.infer<typeof envSchema>;
export {};
//# sourceMappingURL=env.d.ts.map