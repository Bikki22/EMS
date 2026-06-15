"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmailModel = exports.resetPasswordModel = exports.forgotPasswordModel = exports.signinPayloadModel = exports.signupPayloadModel = void 0;
const zod_1 = require("zod");
exports.signupPayloadModel = zod_1.z.object({
    firstName: zod_1.z.string().min(3, "First name must be at least 3 characters"),
    lastName: zod_1.z.string(),
    email: zod_1.z.string().email("Invalid email"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
    phone: zod_1.z.string().min(7, "Invalid phone number"),
});
exports.signinPayloadModel = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email"),
    password: zod_1.z.string().min(1, "Password is required"),
});
exports.forgotPasswordModel = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email"),
});
exports.resetPasswordModel = zod_1.z.object({
    token: zod_1.z.string().min(1, "Token is required"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
});
exports.verifyEmailModel = zod_1.z.object({
    token: zod_1.z.string().min(1, "Token is required"),
});
//# sourceMappingURL=auth.validation.js.map