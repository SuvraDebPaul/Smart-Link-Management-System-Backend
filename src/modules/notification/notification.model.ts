import { model, Schema } from "mongoose";
import type { INotification } from "./notification.interface.js";

const deliveryStateSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["pending", "processing", "sent", "failed", "skipped"],
      required: true,
    },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: null },
    lastAttemptAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    lastError: { type: String, default: null },
  },
  { _id: false },
);

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "campaign-goal",
        "campaign-ended",
        "campaign-report",
        "link-max-clicks",
        "domain-verification-failed",
        "billing-subscription",
        "weekly-analytics",
        "login-security",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    eventKey: { type: String, required: true, unique: true },
    isRead: { type: Boolean, default: false, index: true },
    recipientEmail: { type: String, default: null },
    webhookUrl: { type: String, default: null },
    emailDelivery: { type: deliveryStateSchema, required: true },
    webhookDelivery: { type: deliveryStateSchema, required: true },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ "emailDelivery.status": 1, "emailDelivery.nextAttemptAt": 1 });
notificationSchema.index({ "webhookDelivery.status": 1, "webhookDelivery.nextAttemptAt": 1 });

export const Notification = model<INotification>(
  "Notification",
  notificationSchema,
);
