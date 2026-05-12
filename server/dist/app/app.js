"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApplication = void 0;
const express_1 = __importDefault(require("express"));
const ApiResponse_js_1 = require("./utils/ApiResponse.js");
const env_js_1 = require("./config/env.js");
const createApplication = () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.get("/health", (_req, res) => {
        res.status(200).json(new ApiResponse_js_1.ApiResponse(200, {
            status: "ok",
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            env: env_js_1.env?.NODE_ENV,
        }, "Service healthy"));
    });
    return app;
};
exports.createApplication = createApplication;
//# sourceMappingURL=app.js.map