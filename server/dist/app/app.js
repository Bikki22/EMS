"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApplication = void 0;
const express_1 = __importDefault(require("express"));
const ApiResponse_1 = require("./utils/ApiResponse");
const env_1 = require("./config/env");
const cookie_middleware_1 = require("./middlewares/cookie.middleware");
const cors_middleware_1 = require("./middlewares/cors.middleware");
const error_middleware_1 = require("./middlewares/error.middleware");
const auth_route_1 = __importDefault(require("./modules/auth/auth.route"));
const event_routes_1 = __importDefault(require("./modules/events/event.routes"));
const organizer_route_1 = __importDefault(require("./modules/organizers/organizer.route"));
const booking_routes_1 = __importDefault(require("./modules/bookings/booking.routes"));
const ticket_routes_1 = __importDefault(require("./modules/tickets/ticket.routes"));
const payment_route_1 = __importDefault(require("./modules/payments/payment.route"));
const createApplication = () => {
    const app = (0, express_1.default)();
    // Must run before any route so preflight requests are answered.
    app.use(cors_middleware_1.cors);
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true })); // for provider form callbacks
    app.use(cookie_middleware_1.cookieParser);
    app.get("/health", (_req, res) => {
        res.status(200).json(new ApiResponse_1.ApiResponse(200, {
            status: "ok",
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            env: env_1.env.NODE_ENV,
        }, "Service healthy"));
    });
    app.use("/auth", auth_route_1.default);
    app.use("/api/v1/events", event_routes_1.default);
    app.use("/api/v1/organizers", organizer_route_1.default);
    app.use("/api/v1/bookings", booking_routes_1.default);
    app.use("/api/v1/tickets", ticket_routes_1.default);
    app.use("/api/v1/payments", payment_route_1.default);
    // 404 + centralized error handling (must be last)
    app.use(error_middleware_1.notFoundHandler);
    app.use(error_middleware_1.errorHandler);
    return app;
};
exports.createApplication = createApplication;
//# sourceMappingURL=app.js.map