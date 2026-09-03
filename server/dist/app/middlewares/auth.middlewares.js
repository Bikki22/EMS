"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthenticate = exports.authenticate = void 0;
const token_1 = require("../utils/token");
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Malformed token" });
    }
    try {
        const payload = (0, token_1.verifyAccessToken)(token);
        req.user = {
            _id: payload.sub,
            email: payload.email,
            roles: payload.roles,
        };
        next();
    }
    catch {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};
exports.authenticate = authenticate;
/**
 * Populates `req.user` when a valid token is present and moves on regardless.
 *
 * For endpoints that are public but show more to the right caller — fetching
 * an event by id or slug is public, yet an organizer still needs to preview
 * their own unpublished event through it.
 */
const optionalAuthenticate = (req, _res, next) => {
    const token = req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : undefined;
    if (token) {
        try {
            const payload = (0, token_1.verifyAccessToken)(token);
            req.user = {
                _id: payload.sub,
                email: payload.email,
                roles: payload.roles,
            };
        }
        catch {
            // An unusable token is simply an anonymous caller here.
        }
    }
    next();
};
exports.optionalAuthenticate = optionalAuthenticate;
//# sourceMappingURL=auth.middlewares.js.map