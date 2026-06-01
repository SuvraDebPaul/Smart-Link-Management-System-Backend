import { model, Schema } from "mongoose";
import type { ICampaign } from "./campaign.interface.js";

const campaignSchema = new Schema<ICampaign>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Campaign name is required"],
      trim: true,
    },

    description: {
      type: String,
      default: null,
      trim: true,
    },

    notes: { type: String, default: null, trim: true },
    clientName: { type: String, default: null, trim: true },
    clientEmail: { type: String, default: null, trim: true, lowercase: true },
    clientPhone: { type: String, default: null, trim: true },
    clientCompany: { type: String, default: null, trim: true },

    status: {
      type: String,
      enum: ["active", "paused", "completed"],
      default: "active",
    },

    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    goalClicks: {
      type: Number,
      default: null,
    },
    tags: { type: [String], default: [] },
    budget: { type: Number, default: null },
    conversions: { type: Number, default: 0 },
    revenue: { type: Number, default: null },
    primaryUrl: { type: String, default: null },
    isTemplate: { type: Boolean, default: false, index: true },
    shareEnabled: { type: Boolean, default: false },
    shareToken: { type: String, default: null, unique: true, sparse: true },
    utmPreset: {
      source: { type: String, default: null },
      medium: { type: String, default: null },
      campaign: { type: String, default: null },
      term: { type: String, default: null },
      content: { type: String, default: null },
    },
    reportFrequency: { type: String, enum: ["none", "daily", "weekly"], default: "none" },
    lastReportAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

export const Campaign = model<ICampaign>("Campaign", campaignSchema);
