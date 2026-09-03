"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmailModel = exports.resetPasswordModel = exports.resendVerificationModel = exports.forgotPasswordModel = exports.signinPayloadModel = exports.signupPayloadModel = void 0;
const zod_1 = require("zod");
// Normalising here keeps signup, login, forgot-password and resend agreeing on
// what "the same address" means, rather than leaning on Mongoose quietly
// applying the schema's lowercase setter to query filters.
const emailField = zod_1.z.string().trim().toLowerCase().email("Invalid email");
exports.signupPayloadModel = zod_1.z.object({
    firstName: zod_1.z.string().trim().min(3, "First name must be at least 3 characters"),
    lastName: zod_1.z.string().trim().min(1, "Last name is required"),
    email: emailField,
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
    phone: zod_1.z.string().trim().min(10, "Invalid phone number"),
});
exports.signinPayloadModel = zod_1.z.object({
    email: emailField,
    password: zod_1.z.string().min(1, "Password is required"),
});
exports.forgotPasswordModel = zod_1.z.object({
    email: emailField,
});
exports.resendVerificationModel = zod_1.z.object({
    email: emailField,
});
exports.resetPasswordModel = zod_1.z.object({
    token: zod_1.z.string().min(1, "Token is required"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
});
exports.verifyEmailModel = zod_1.z.object({
    token: zod_1.z.string().min(1, "Token is required"),
});
//# sourceMappingURL=auth.validation.js.map