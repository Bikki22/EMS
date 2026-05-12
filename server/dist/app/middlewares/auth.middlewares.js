"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticationMiddleware = authenticationMiddleware;
exports.restrictToAuthenticatedUser = restrictToAuthenticatedUser;
const token_1 = require("../utils/token");
function authenticationMiddleware() {
    return function (req, res, next) {
        const header = req.headers["authorization"];
        if (!header)
            next();
        if (!header?.startsWith("Bearer")) {
            return res
                .status(400)
                .json({ error: `authorization header must start with Bearer ` });
        }
        const token = header.split("")[1];
        if (!token) {
            return res.status(400).json({
                error: `authorization header must start with Bearer and followed by token`,
            });
        }
        const user = (0, token_1.verifyUserToken)(token);
        // @ts-ignore
        req.user = user;
        next();
    };
}
function restrictToAuthenticatedUser() {
    return function (req, res, next) {
        //  @ts-ignore
        if (!req.user)
            return res.status(401).json({ error: "Authentication requried" });
        return next();
    };
}
//# sourceMappingURL=auth.middlewares.js.map