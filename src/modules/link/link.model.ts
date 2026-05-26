import { model, Schema } from "mongoose";
import type { ILink } from "./link.interface.js";

const linkSchema = new Schema<ILink>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User Id is required"],
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
    expiresAt: {
      type: Date,
      default: null,
    },
    maxClicks: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

linkSchema.index({ shortCode: 1, domainId: 1 }, { unique: true });

export const Link = model<ILink>("Link", linkSchema);
