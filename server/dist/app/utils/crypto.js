"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPassword = exports.hashPassword = exports.generateSalt = void 0;
const node_crypto_1 = require("node:crypto");
const generateSalt = () => (0, node_crypto_1.randomBytes)(32).toString("hex");
exports.generateSalt = generateSalt;
const hashPassword = (password, salt) => (0, node_crypto_1.createHmac)("sha256", salt).update(password).digest("hex");
exports.hashPassword = hashPassword;
const verifyPassword = (password, salt, storedHash) => (0, exports.hashPassword)(password, salt) === storedHash;
exports.verifyPassword = verifyPassword;
//# sourceMappingURL=crypto.js.map