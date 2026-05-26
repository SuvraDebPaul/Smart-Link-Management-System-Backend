import { model, Schema } from "mongoose";
import type { IPageVisit } from "./pageVisit.interface.js";

const pageVisitSchema = new Schema<IPageVisit>(
  {
    pageId: {
      type: Schema.Types.ObjectId,
      ref: "Page",
      required: [true, "Page ID is required"],
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },

    slug: {
      type: String,
      required: [true, "Slug is required"],
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

    visitedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export const PageVisit = model<IPageVisit>("PageVisit", pageVisitSchema);
