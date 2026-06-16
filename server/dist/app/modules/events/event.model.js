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
exports.Event = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const slugify_1 = __importDefault(require("slugify"));
const ticketTypeSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "USD", uppercase: true },
    totalQuantity: { type: Number, required: true, min: 1 },
    availableQuantity: { type: Number, required: true, min: 0 },
    maxPerBooking: {
        type: Number,
        default: 10,
        min: [1, "Max per booking must be at least 1"],
    },
    salesStartAt: { type: Date, required: true },
    salesEndAt: { type: Date, required: true },
    quantitySold: { type: Number, default: 0 },
});
const eventLocationSchema = new mongoose_1.default.Schema({
    type: {
        type: String,
        enum: ["online", "physical"],
        required: true,
    },
    url: { type: String, trim: true },
    platform: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    country: { type: String, trim: true },
}, { _id: false });
const eventSchema = new mongoose_1.default.Schema({
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    organizer: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Organizer",
        required: true,
        index: true,
    },
    location: { type: eventLocationSchema, required: true },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true },
    ticketTypes: { type: [ticketTypeSchema], default: [] },
    bannerUrl: { type: String, default: null },
    status: {
        type: String,
        enum: ["draft", "published", "cancelled"],
        default: "draft",
        index: true,
    },
    totalCapacity: { type: Number, default: 0 },
}, { timestamps: true });
eventSchema.pre("save", async function () {
    if (!this.isModified("title") && this.slug)
        return;
    const base = (0, slugify_1.default)(this.title, { lower: true, strict: true });
    const suffix = Math.random().toString(36).slice(2, 7);
    this.slug = `${base}-${suffix}`;
});
eventSchema.pre("save", function () {
    this.ticketTypes.forEach((tt) => {
        tt.availableQuantity = tt.totalQuantity - tt.quantitySold;
    });
});
eventSchema.pre("save", function () {
    this.totalCapacity = this.ticketTypes.reduce((sum, t) => sum + t.totalQuantity, 0);
});
eventSchema.index({ title: "text", description: "text", tags: "text" });
eventSchema.index({ "location.city": 1 });
eventSchema.index({ "location.country": 1 });
eventSchema.index({ "location.type": 1 });
exports.Event = (0, mongoose_1.model)("Event", eventSchema);
//# sourceMappingURL=event.model.js.map