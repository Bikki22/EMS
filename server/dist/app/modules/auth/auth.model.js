"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userSchema = new mongoose_1.default.Schema({
    firstName: {
        type: String,
        trim: true,
        minLength: [3, "Name must be more than 3 characters"],
        required: true,
    },
    lastName: {
        type: String,
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        lowercase: true,
        trim: true,
        unique: true,
    },
    password: {
        type: String,
        minLength: [6, "password must at least of 6 character"],
        trim: true,
    },
    emailVerified: {
        type: Date,
        lowerCase: true,
        trim: true,
        default: null,
    },
    socialIdentities: [
        {
            provider: { type: String, required: true },
            providerUserId: { type: String, required: true },
        },
    ],
    roles: {
        type: String,
        enum: ["user", "org_owner", "admin"],
        default: "user",
    },
    phone: {
        type: String,
        required: true,
        unique: true,
    },
    avatarUrl: {
        type: String,
        default: null,
    },
    status: {
        type: String,
        enum: ["active", "suspended", "deleted"],
        default: "active",
    },
    lastLogin: {
        type: Date,
        default: null,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({
    "socialIdentities.provider": 1,
    "socialIdentities.providerUserId": 1,
});
userSchema.pre("save", async function () {
    if (!this.isModified("password"))
        return;
    this.password = await bcryptjs_1.default.hash(this.password, 10);
});
exports.User = (0, mongoose_1.model)("User", userSchema);
//# sourceMappingURL=auth.model.js.map