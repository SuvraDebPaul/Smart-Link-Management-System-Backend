import { model, Schema } from "mongoose";
import type { IPageLinkClick } from "./pageLinkClick.interface.js";

const pageLinkClickSchema = new Schema<IPageLinkClick>(
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

    linkIndex: {
      type: Number,
      required: [true, "Link index is required"],
    },

    linkTitle: {
      type: String,
      required: [true, "Link title is required"],
    },

    linkUrl: {
      type: String,
      required: [true, "Link URL is required"],
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

export const PageLinkClick = model<IPageLinkClick>(
  "PageLinkClick",
  pageLinkClickSchema,
);
