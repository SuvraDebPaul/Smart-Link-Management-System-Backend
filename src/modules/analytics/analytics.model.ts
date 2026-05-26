import { model, Schema } from "mongoose";
import type { IClickEvent } from "./analytics.interface.js";

const clickEventSchema = new Schema<IClickEvent>(
  {
    linkId: {
      type: Schema.Types.ObjectId,
      ref: "Link",
      required: [true, "Link ID is required"],
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },

    shortCode: {
      type: String,
      required: [true, "Short code is required"],
      index: true,
    },

    ipAddress: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },

    browser: {
      type: String,
      default: null,
    },

    os: {
      type: String,
      default: null,
    },

    device: {
      type: String,
      default: null,
    },

    referrer: {
      type: String,
      default: null,
    },

    clickedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export const ClickEvent = model<IClickEvent>("ClickEvent", clickEventSchema);
