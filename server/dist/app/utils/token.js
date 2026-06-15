"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.verifyAccessToken = exports.issueRefreshToken = exports.issueAccessToken = exports.hashToken = exports.generateOpaqueToken = exports.generateFamilyId = exports.generateJti = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const node_crypto_1 = require("node:crypto");
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET;
const TOKEN_HASH_SECRET = process.env.TOKEN_HASH_SECRET;
const generateJti = () => (0, node_crypto_1.randomBytes)(32).toString("hex");
exports.generateJti = generateJti;
const generateFamilyId = () => (0, node_crypto_1.randomBytes)(32).toString("hex");
exports.generateFamilyId = generateFamilyId;
const generateOpaqueToken = () => (0, node_crypto_1.randomBytes)(32).toString("hex");
exports.generateOpaqueToken = generateOpaqueToken;
const hashToken = (token) => (0, node_crypto_1.createHmac)("sha256", TOKEN_HASH_SECRET).update(token).digest("hex");
exports.hashToken = hashToken;
const issueAccessToken = (sub, email) => {
    const payload = { sub, email, type: "access" };
    return jsonwebtoken_1.default.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
};
exports.issueAccessToken = issueAccessToken;
const issueRefreshToken = (sub, familyId, jti) => {
    const payload = { sub, familyId, jti, type: "refresh" };
    return jsonwebtoken_1.default.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
};
exports.issueRefreshToken = issueRefreshToken;
const verifyAccessToken = (token) => jsonwebtoken_1.default.verify(token, ACCESS_SECRET);
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => jsonwebtoken_1.default.verify(token, REFRESH_SECRET);
exports.verifyRefreshToken = verifyRefreshToken;
//# sourceMappingURL=token.js.map