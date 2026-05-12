"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
class ApiError extends Error {
    statusCode;
    data;
    success;
    errors;
    constructor(statusCode, message = "something went wrong", errors = [], stack = "") {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
        this.data = null;
        this.success = false;
        this.errors = errors;
        if (stack) {
            this.stack = stack;
        }
        else if (typeof Error.captureStackTrace ===
            "function") {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
exports.ApiError = ApiError;
//# sourceMappingURL=ApiError.js.map