"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signup = void 0;
const node_crypto_1 = require("node:crypto");
const auth_model_1 = require("../modules/auth/auth.model");
const generateSalt = () => (0, node_crypto_1.randomBytes)(32).toString("hex");
const hashPassword = (password, salt) => (0, node_crypto_1.createHmac)("sha256", salt).update(password).digest("hex");
const verifyPassword = (password, salt, hash) => hashPassword(password, salt) === hash;
const signup = async (data) => {
    const { firstName, lastName, email, password, phone } = data;
    const hash = hashPassword(password, generateSalt());
    await auth_model_1.User.create({
        firstName,
        lastName,
        email,
        password: hash,
        phone,
    });
};
exports.signup = signup;
//# sourceMappingURL=auth.services.js.map