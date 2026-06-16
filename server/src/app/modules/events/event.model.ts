import mongoose, { Document, model, Types } from "mongoose";
import slugify from "slugify";

export interface ITicketType {
  _id?: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  totalQuantity: number;
  availableQuantity: number;
  quantitySold: number;
  maxPerBooking: number;
  salesStartAt?: Date | undefined;
  salesEndAt?: Date | undefined;
  isActive: boolean;
}
export interface IEventLocation {
  type: "online" | "physical";
  url?: string;
  platform?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface IEvent extends Document {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
  organizer: Types.ObjectId;
  location: IEventLocation;
  startsAt: Date;
  endsAt: Date;
  ticketTypes: ITicketType[];
  bannerUrl: string | null;
  status: "draft" | "published" | "cancelled";
  totalCapacity: number;
  createdAt: Date;
  updatedAt: Date;
}

const ticketTypeSchema = new mongoose.Schema<ITicketType>({
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

const eventLocationSchema = new mongoose.Schema<IEventLocation>(
  {
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
  },
  { _id: false },
);

const eventSchema = new mongoose.Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
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
  },
  { timestamps: true },
);

eventSchema.pre("save", async function () {
  if (!this.isModified("title") && this.slug) return;

  const base = slugify(this.title, { lower: true, strict: true });
  const suffix = Math.random().toString(36).slice(2, 7);
  this.slug = `${base}-${suffix}`;
});

eventSchema.pre("save", function () {
  this.ticketTypes.forEach((tt) => {
    tt.availableQuantity = tt.totalQuantity - tt.quantitySold;
  });
});

eventSchema.pre("save", function () {
  this.totalCapacity = this.ticketTypes.reduce(
    (sum, t) => sum + t.totalQuantity,
    0,
  );
});

eventSchema.index({ title: "text", description: "text", tags: "text" });
eventSchema.index({ "location.city": 1 });
eventSchema.index({ "location.country": 1 });
eventSchema.index({ "location.type": 1 });

export const Event = model<IEvent>("Event", eventSchema);
