import { model, Schema } from "mongoose";
import type { ILink } from "./link.interface.js";
import { randomBytes } from "node:crypto";

const linkSchema = new Schema<ILink>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    isGuest: {
      type: Boolean,
      default: false,
      index: true,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      default: null,
      index: true,
    },
    domainId: {
      type: Schema.Types.ObjectId,
      ref: "Domain",
      default: null,
      index: true,
    },
    originalUrl: {
      type: String,
      required: [true, "Original Url is required"],
      trim: true,
    },
    shortCode: {
      type: String,
      required: [true, "Short code is required"],
      trim: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    folder: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    notes: {
      type: String,
      default: null,
      trim: true,
    },
    isFavorite: {
      type: Boolean,
      default: false,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    clicks: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    isPasswordProtected: {
      type: Boolean,
      default: false,
    },
    passwordHash: {
      type: String,
      select: false,
      default: null,
    },
    startsAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    maxClicks: {
      type: Number,
      default: null,
    },
    healthStatus: { type: String, enum: ["unchecked", "healthy", "broken"], default: "unchecked", index: true },
    healthStatusCode: { type: Number, default: null },
    healthCheckedAt: { type: Date, default: null },
    conversionToken: { type: String, default: () => randomBytes(24).toString("hex"), unique: true, sparse: true },
  },
  {
    timestamps: true,
  },
);

linkSchema.index({ shortCode: 1, domainId: 1 }, { unique: true });
linkSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { isGuest: true } },
);

export const Link = model<ILink>("Link", linkSchema);
