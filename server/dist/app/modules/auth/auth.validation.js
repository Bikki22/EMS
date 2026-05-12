"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignRoleModel = exports.verifyEmailModel = exports.changePasswordModel = exports.resetPasswordModel = exports.forgotPasswordModel = exports.signinPayloadModel = exports.signupPayloadModel = void 0;
const zod_1 = require("zod");
exports.signupPayloadModel = zod_1.z.object({
    firstName: zod_1.z.string().min(3),
    lastName: zod_1.z.string(),
    email: zod_1.z.email(),
    password: zod_1.z.string().min(6),
    phone: zod_1.z.string().min(10),
});
exports.signinPayloadModel = zod_1.z.object({
    email: zod_1.z.email(),
    password: zod_1.z.string().min(6),
});
exports.forgotPasswordModel = zod_1.z.object({
    email: zod_1.z.string().email(),
});
exports.resetPasswordModel = zod_1.z.object({
    password: zod_1.z.string().min(6).max(100),
});
exports.changePasswordModel = zod_1.z.object({
    currentPassword: zod_1.z.string().min(6),
    newPassword: zod_1.z.string().min(6).max(100),
});
exports.verifyEmailModel = zod_1.z.object({
    token: zod_1.z.string().min(1),
});
exports.assignRoleModel = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    role: zod_1.z.enum(["user", "org_owner", "admin"]),
});
//# sourceMappingURL=auth.validation.js.map