import { z } from "zod";
export declare const signupPayloadModel: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    phone: z.ZodString;
}, z.core.$strip>;
export declare const signinPayloadModel: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const forgotPasswordModel: z.ZodObject<{
    email: z.ZodString;
}, z.core.$strip>;
export declare const resetPasswordModel: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const verifyEmailModel: z.ZodObject<{
    token: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=auth.validation.d.ts.map