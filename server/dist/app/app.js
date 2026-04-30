"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApplication = void 0;
const express_1 = __importDefault(require("express"));
const ApiResponse_1 = require("./utils/ApiResponse");
const env_1 = require("./config/env");
const createApplication = () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.get("/health", (_req, res) => {
        res.status(200).json(new ApiResponse_1.ApiResponse(200, {
            status: "ok",
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            env: env_1.env === null || env_1.env === void 0 ? void 0 : env_1.env.NODE_ENV,
        }, "Service healthy"));
    });
    return app;
};
exports.createApplication = createApplication;
