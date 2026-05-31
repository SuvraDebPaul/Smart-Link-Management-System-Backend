import { Schema, model } from "mongoose";
import type { IApiKey } from "./apiKey.interface.js";

const apiKeySchema = new Schema<IApiKey>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    keyHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },

    keyPrefix: {
      type: String,
      required: true,
    },

    lastUsedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

apiKeySchema.index({ user: 1 });
apiKeySchema.index({ keyPrefix: 1 });
apiKeySchema.index({ isActive: 1 });

export const ApiKey = model<IApiKey>("ApiKey", apiKeySchema);
