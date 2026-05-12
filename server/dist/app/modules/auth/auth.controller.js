"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const auth_model_1 = require("./auth.model");
const auth_validation_1 = require("./auth.validation");
const token_1 = require("../../utils/token");
const auth_services_1 = require("../../services/auth.services");
class AuthenticationController {
    async handleSignup(req, res) {
        const validationResult = await auth_validation_1.signupPayloadModel.safeParseAsync(req.body);
        if (validationResult.error) {
            return res.status(400).json({
                message: "Body validation failed",
                error: validationResult.error.issues,
            });
        }
        const { email } = validationResult.data;
        const userEmailResult = await auth_model_1.User.findOne({
            email,
        });
        if (userEmailResult) {
            return res.status(400).json({
                message: `User with email ${email} already exists`,
                error: "duplicate entry",
            });
        }
        const result = (0, auth_services_1.signup)(validationResult.data);
        return res.status(201).json({
            message: "user has been created successfuly",
            data: { result },
        });
    }
    async handleLogin(req, res) {
        const validationResult = await auth_validation_1.signinPayloadModel.safeParseAsync(req.body);
        if (validationResult.error) {
            return res.status(400).json({
                message: "body validation failed",
                error: validationResult.error.issues,
            });
        }
        const { email, password } = validationResult.data;
        const user = await auth_model_1.User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                message: `user with ${email} doesnot exists`,
            });
        }
        const salt = (0, node_crypto_1.randomBytes)(32).toString("hex");
        const hash = (0, node_crypto_1.createHmac)("sha256", salt).update(password).digest("hex");
        if (user.password !== hash) {
            return res
                .status(400)
                .json({ message: "email or password is incorrect" });
        }
        const token = (0, token_1.createUserToken)({ _id: user._id.toString() });
        return res
            .status(200)
            .json({ message: "user login successfully", data: { token } });
    }
    async handleMe(req, res) {
        // @ts-ignore
        const { _id } = req.user;
        const userResult = await auth_model_1.User.findOne({ _id });
        return res.status(200).json({
            firstName: userResult?.firstName,
            lastName: userResult?.lastName,
            email: userResult?.email,
        });
    }
    async handleLogout(req, res) {
        const token = req.cookies?.refreshToken;
        if (token) {
            // @ts-ignore
            const user = await auth_model_1.User.findById(req.user?._id);
        }
    }
}
exports.default = AuthenticationController;
//# sourceMappingURL=auth.controller.js.map