"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.verifyAccessToken = exports.issueRefreshToken = exports.issueAccessToken = exports.hashToken = exports.generateOpaqueToken = exports.generateFamilyId = exports.generateJti = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const node_crypto_1 = require("node:crypto");
const env_1 = require("../config/env");
const ACCESS_SECRET = env_1.env.ACCESS_TOKEN_SECRET;
const REFRESH_SECRET = env_1.env.REFRESH_TOKEN_SECRET;
const TOKEN_HASH_SECRET = env_1.env.TOKEN_HASH_SECRET;
const generateJti = () => (0, node_crypto_1.randomBytes)(32).toString("hex");
exports.generateJti = generateJti;
const generateFamilyId = () => (0, node_crypto_1.randomBytes)(32).toString("hex");
exports.generateFamilyId = generateFamilyId;
const generateOpaqueToken = () => (0, node_crypto_1.randomBytes)(32).toString("hex");
exports.generateOpaqueToken = generateOpaqueToken;
const hashToken = (token) => (0, node_crypto_1.createHmac)("sha256", TOKEN_HASH_SECRET).update(token).digest("hex");
exports.hashToken = hashToken;
const issueAccessToken = (sub, email, roles) => {
    const payload = { sub, email, roles, type: "access" };
    return jsonwebtoken_1.default.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
};
exports.issueAccessToken = issueAccessToken;
const issueRefreshToken = (sub, familyId, jti) => {
    const payload = { sub, familyId, jti, type: "refresh" };
    return jsonwebtoken_1.default.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
};
exports.issueRefreshToken = issueRefreshToken;
// The separate secrets are what really keep the two token kinds apart, but
// asserting the claim as well means a future refactor that derives one secret
// from the other doesn't silently make an access token a valid refresh token.
const verifyAccessToken = (token) => {
    const payload = jsonwebtoken_1.default.verify(token, ACCESS_SECRET);
    if (payload.type !== "access") {
        throw new Error("Expected an access token");
    }
    return payload;
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => {
    const payload = jsonwebtoken_1.default.verify(token, REFRESH_SECRET);
    if (payload.type !== "refresh") {
        throw new Error("Expected a refresh token");
    }
    return payload;
};
exports.verifyRefreshToken = verifyRefreshToken;
//# sourceMappingURL=token.js.map