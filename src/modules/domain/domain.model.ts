import { model, Schema } from "mongoose";
import type { IDomain } from "./domain.interface.js";

const domainSchema = new Schema<IDomain>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },

    domain: {
      type: String,
      required: [true, "Domain is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "verified", "failed"],
      default: "pending",
    },

    verificationToken: {
      type: String,
      required: [true, "Verification token is required"],
      unique: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Domain = model<IDomain>("Domain", domainSchema);
