import { Types } from "mongoose";
import config from "../../config/index.js";
import AppError from "../../errors/AppError.js";
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
  "campaign-ended": "campaignGoalReached",
  "campaign-report": "weeklyAnalyticsReport",
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

const getMyNotifications = async (
  userId: string,
  options: { page?: number; limit?: number; status?: string } = {},
) => {
  const userObjectId = new Types.ObjectId(userId);
  const page = Math.max(options.page ?? 1, 1);
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const filter: { userId: Types.ObjectId; isRead?: boolean } = {
    userId: userObjectId,
  };

  if (options.status === "unread") filter.isRead = false;
  if (options.status === "read") filter.isRead = true;

  const [notifications, unreadCount, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Notification.countDocuments({ userId: userObjectId, isRead: false }),
    Notification.countDocuments(filter),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
};

const markAllAsRead = async (userId: string) => {
  await Notification.updateMany(
    { userId: new Types.ObjectId(userId), isRead: false },
    { $set: { isRead: true } },
  );
};

const markAsRead = async (userId: string, notificationId: string) => {
  if (!Types.ObjectId.isValid(notificationId)) {
    throw new AppError(404, "Notification not found");
  }

  const result = await Notification.updateOne(
    { _id: notificationId, userId: new Types.ObjectId(userId) },
    { $set: { isRead: true } },
  );

  if (result.matchedCount === 0) {
    throw new AppError(404, "Notification not found");
  }
};

const deleteNotification = async (userId: string, notificationId: string) => {
  if (!Types.ObjectId.isValid(notificationId)) {
    throw new AppError(404, "Notification not found");
  }

  const result = await Notification.deleteOne({
    _id: notificationId,
    userId: new Types.ObjectId(userId),
  });

  if (result.deletedCount === 0) {
    throw new AppError(404, "Notification not found");
  }
};

export const NotificationServices = {
  createNotification,
  getMyNotifications,
  markAllAsRead,
  markAsRead,
  deleteNotification,
};
