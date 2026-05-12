import { z } from "zod";
export declare const signupPayloadModel: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodString;
    email: z.ZodEmail;
    password: z.ZodString;
    phone: z.ZodString;
}, z.core.$strip>;
export declare const signinPayloadModel: z.ZodObject<{
    email: z.ZodEmail;
    password: z.ZodString;
}, z.core.$strip>;
export declare const forgotPasswordModel: z.ZodObject<{
    email: z.ZodString;
}, z.core.$strip>;
export declare const resetPasswordModel: z.ZodObject<{
    password: z.ZodString;
}, z.core.$strip>;
export declare const changePasswordModel: z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
}, z.core.$strip>;
export declare const verifyEmailModel: z.ZodObject<{
    token: z.ZodString;
}, z.core.$strip>;
export declare const assignRoleModel: z.ZodObject<{
    userId: z.ZodString;
    role: z.ZodEnum<{
        user: "user";
        org_owner: "org_owner";
        admin: "admin";
    }>;
}, z.core.$strip>;
//# sourceMappingURL=auth.validation.d.ts.map