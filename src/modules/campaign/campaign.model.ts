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

    status: {
      type: String,
      enum: ["active", "paused", "completed"],
      default: "active",
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
  },
  {
    timestamps: true,
  },
);

export const Campaign = model<ICampaign>("Campaign", campaignSchema);
