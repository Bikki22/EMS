"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = __importDefault(require("express"));
const auth_controller_js_1 = __importDefault(require("./auth.controller.js"));
const authenticationController = new auth_controller_js_1.default();
exports.authRouter = express_1.default.Router();
exports.authRouter.post("/sign-up", authenticationController.handleSignup.bind(authenticationController));
exports.authRouter.post("/sign-in", authenticationController.handleLogin.bind(authenticationController));
//# sourceMappingURL=auth.route.js.map