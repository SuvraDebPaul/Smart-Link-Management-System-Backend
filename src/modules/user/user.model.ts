import { model, Schema } from "mongoose";
import type { IUser } from "./user.interface.js";

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    betterAuthUserId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    plan: {
      type: String,
      enum: ["free", "starter", "pro"],
      default: "free",
      index: true,
    },

    subscriptionStatus: {
      type: String,
      enum: ["none", "active", "trialing", "past_due", "cancelled"],
      default: "none",
      index: true,
    },

    subscriptionProvider: {
      type: String,
      enum: ["manual", "stripe", "sslcommerz", "paddle", null],
      default: null,
    },

    subscriptionId: {
      type: String,
      default: null,
    },

    stripeCustomerId: {
      type: String,
      default: null,
      index: true,
    },

    currentPeriodStart: {
      type: Date,
      default: null,
    },

    currentPeriodEnd: {
      type: Date,
      default: null,
    },

    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },

    companyName: {
      type: String,
      default: null,
    },

    timezone: {
      type: String,
      default: "Asia/Dhaka",
    },

    notificationPreferences: {
      weeklyAnalyticsReport: {
        type: Boolean,
        default: true,
      },
      campaignGoalReached: {
        type: Boolean,
        default: true,
      },
      linkMaxClicksReached: {
        type: Boolean,
        default: true,
      },
      domainVerificationFailed: {
        type: Boolean,
        default: true,
      },
      securityLoginAlert: {
        type: Boolean,
        default: true,
      },
      billingSubscriptionAlert: {
        type: Boolean,
        default: true,
      },
    },

    apiSecurityPreferences: {
      defaultApiKeyExpiryDays: {
        type: Number,
        default: null,
      },
      allowedIpAddresses: {
        type: [String],
        default: [],
      },
      webhookUrl: {
        type: String,
        default: null,
      },
    },

    qrDefaultPreferences: {
      foregroundColor: {
        type: String,
        default: "#0ea5e9",
      },
      backgroundColor: {
        type: String,
        default: "#ffffff",
      },
      size: {
        type: Number,
        default: 500,
      },
      downloadFormat: {
        type: String,
        enum: ["png", "svg"],
        default: "png",
      },
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export const User = model<IUser>("User", userSchema);
