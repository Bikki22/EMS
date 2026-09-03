"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPassword = exports.hashPassword = exports.isLegacyPasswordHash = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const node_crypto_1 = require("node:crypto");
// bcrypt cost factor: slow enough that an offline attack on a leaked dump is
// expensive, fast enough for an interactive login.
const BCRYPT_COST = 12;
// Accounts created before the move to bcrypt store a single round of
// HMAC-SHA256 keyed by a per-user salt in `User.salt`. A bcrypt hash is
// self-describing, so the stored value tells us which scheme produced it and
// no migration flag is needed.
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$/;
const isLegacyPasswordHash = (storedHash) => !BCRYPT_HASH.test(storedHash);
exports.isLegacyPasswordHash = isLegacyPasswordHash;
const hashPassword = (password) => bcryptjs_1.default.hash(password, BCRYPT_COST);
exports.hashPassword = hashPassword;
const legacyHash = (password, salt) => (0, node_crypto_1.createHmac)("sha256", salt).update(password).digest("hex");
const constantTimeEquals = (a, b) => {
    const left = Buffer.from(a, "utf8");
    const right = Buffer.from(b, "utf8");
    if (left.length !== right.length)
        return false;
    return (0, node_crypto_1.timingSafeEqual)(left, right);
};
const verifyPassword = async (password, storedHash, salt) => {
    if ((0, exports.isLegacyPasswordHash)(storedHash)) {
        if (!salt)
            return false;
        return constantTimeEquals(legacyHash(password, salt), storedHash);
    }
    return bcryptjs_1.default.compare(password, storedHash);
};
exports.verifyPassword = verifyPassword;
//# sourceMappingURL=crypto.js.map