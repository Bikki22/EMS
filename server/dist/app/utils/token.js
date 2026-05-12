"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserToken = createUserToken;
exports.verifyUserToken = verifyUserToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = "myjwtsecret";
function createUserToken(payload) {
    const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET);
    return token;
}
function verifyUserToken(token) {
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return payload;
    }
    catch (error) {
        return null;
    }
}
//# sourceMappingURL=token.js.map