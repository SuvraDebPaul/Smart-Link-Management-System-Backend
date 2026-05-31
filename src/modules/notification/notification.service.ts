import { Types } from "mongoose";
import config from "../../config/index.js";
import { User } from "../user/user.model.js";
import type { TNotificationPreferences } from "../user/user.interface.js";
import type { TNotificationType } from "./notification.interface.js";
import { Notification } from "./notification.model.js";
import { NotificationDeliveryServices } from "./notification-delivery.service.js";

const preferenceKeyByType: Record<
  TNotificationType,
  keyof TNotificationPreferences
> = {
  "campaign-goal": "campaignGoalReached",
  "link-max-clicks": "linkMaxClicksReached",
  "domain-verification-failed": "domainVerificationFailed",
  "billing-subscription": "billingSubscriptionAlert",
  "weekly-analytics": "weeklyAnalyticsReport",
  "login-security": "securityLoginAlert",
};

const createNotification = async (payload: {
  userId: Types.ObjectId;
  type: TNotificationType;
  title: string;
  message: string;
  eventKey: string;
}) => {
  const user = await User.findById(payload.userId).select(
    "email notificationPreferences apiSecurityPreferences.webhookUrl",
  );

  if (!user) {
    return;
  }

  if (user.notificationPreferences?.[preferenceKeyByType[payload.type]] === false) {
    return;
  }

  const webhookUrl = user.apiSecurityPreferences?.webhookUrl ?? null;
  const now = new Date();
  const pendingDeliveryState = {
    status: "pending" as const,
    attempts: 0,
    nextAttemptAt: now,
    lastAttemptAt: null,
    deliveredAt: null,
    lastError: null,
  };
  const skippedDeliveryState = {
    status: "skipped" as const,
    attempts: 0,
    nextAttemptAt: null,
    lastAttemptAt: null,
    deliveredAt: null,
    lastError: null,
  };
  const result = await Notification.updateOne(
    { eventKey: payload.eventKey },
    {
      $setOnInsert: {
        ...payload,
        recipientEmail: user.email,
        webhookUrl,
        emailDelivery:
          config.resend_api_key && config.email_from
            ? pendingDeliveryState
            : skippedDeliveryState,
        webhookDelivery: webhookUrl ? pendingDeliveryState : skippedDeliveryState,
      },
    },
    { upsert: true },
  );

  if (result.upsertedCount === 1 && result.upsertedId) {
    void NotificationDeliveryServices.deliverNotification(
      result.upsertedId.toString(),
    ).catch((error) => {
      console.error("Failed to process notification delivery", error);
    });
  }
};

const getMyNotifications = async (userId: string) => {
  const userObjectId = new Types.ObjectId(userId);
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .limit(20),
    Notification.countDocuments({ userId: userObjectId, isRead: false }),
  ]);

  return { notifications, unreadCount };
};

const markAllAsRead = async (userId: string) => {
  await Notification.updateMany(
    { userId: new Types.ObjectId(userId), isRead: false },
    { $set: { isRead: true } },
  );
};

export const NotificationServices = {
  createNotification,
  getMyNotifications,
  markAllAsRead,
};
