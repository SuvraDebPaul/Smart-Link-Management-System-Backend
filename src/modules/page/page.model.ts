import { model, Schema } from "mongoose";
import type { IPage, IPageLink } from "./page.interface.js";

const pageLinkSchema = new Schema<IPageLink>(
  {
    title: {
      type: String,
      required: [true, "Link title is required"],
      trim: true,
    },

    url: {
      type: String,
      required: [true, "Link URL is required"],
      trim: true,
    },

    order: {
      type: Number,
      required: [true, "Link order is required"],
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  },
);

const pageSchema = new Schema<IPage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },

    slug: {
      type: String,
      required: [true, "Page slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, "Page title is required"],
      trim: true,
    },

    bio: {
      type: String,
      default: null,
      trim: true,
    },

    avatarUrl: {
      type: String,
      default: null,
      trim: true,
    },

    theme: {
      type: String,
      enum: ["light", "dark", "gradient"],
      default: "light",
    },

    links: {
      type: [pageLinkSchema],
      default: [],
    },

    visits: {
      type: Number,
      default: 0,
    },

    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Page = model<IPage>("Page", pageSchema);
