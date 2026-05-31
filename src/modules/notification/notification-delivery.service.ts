import type { HydratedDocument } from "mongoose";
import { Notification } from "./notification.model.js";
import type { INotification } from "./notification.interface.js";
import { EmailDeliveryServices } from "./email-delivery.service.js";
import { WebhookDeliveryServices } from "./webhook-delivery.service.js";

type TChannel = "emailDelivery" | "webhookDelivery";

const maxAttempts = 5;
const retryDelayMinutes = [1, 5, 30, 120, 720];
const processingTimeoutMinutes = 10;

const getNextAttemptAt = (attempts: number) => {
  if (attempts >= maxAttempts) {
    return null;
  }

  const delayMinutes =
    retryDelayMinutes[Math.min(attempts - 1, retryDelayMinutes.length - 1)]!;

  return new Date(Date.now() + delayMinutes * 60 * 1000);
};

const markDeliveryResult = async (
  notificationId: string,
  channel: TChannel,
  result: { delivered: boolean; error?: string },
) => {
  const prefix = channel;
  const now = new Date();
  const notification = await Notification.findById(notificationId).select(
    `${prefix}.attempts`,
  );
  const attempts = notification?.[channel].attempts ?? 1;

  await Notification.updateOne(
    { _id: notificationId },
    result.delivered
      ? {
          $set: {
            [`${prefix}.status`]: "sent",
            [`${prefix}.deliveredAt`]: now,
            [`${prefix}.nextAttemptAt`]: null,
            [`${prefix}.lastError`]: null,
          },
        }
      : {
          $set: {
            [`${prefix}.status`]: "failed",
            [`${prefix}.nextAttemptAt`]: getNextAttemptAt(attempts),
            [`${prefix}.lastError`]: result.error?.slice(0, 500) ?? "Unknown error",
          },
        },
  );
};

const deliverClaimedChannel = async (
  notification: HydratedDocument<INotification> | null,
  channel: TChannel,
) => {
  if (!notification) return;

  try {
    if (channel === "emailDelivery") {
      await EmailDeliveryServices.deliverNotificationEmail(
        notification.recipientEmail!,
        notification,
      );
    } else {
      await WebhookDeliveryServices.deliverNotificationWebhook(
        notification.webhookUrl!,
        {
          type: notification.type,
          title: notification.title,
          message: notification.message,
          eventKey: notification.eventKey,
          createdAt: notification.createdAt.toISOString(),
        },
      );
    }

    await markDeliveryResult(notification._id.toString(), channel, {
      delivered: true,
    });
  } catch (error) {
    await markDeliveryResult(notification._id.toString(), channel, {
      delivered: false,
      error: error instanceof Error ? error.message : "Unknown delivery error",
    });
  }
};

const claimDelivery = async (notificationId: string, channel: TChannel) => {
  const now = new Date();
  const staleProcessingDate = new Date(
    now.getTime() - processingTimeoutMinutes * 60 * 1000,
  );

  return Notification.findOneAndUpdate(
    {
      _id: notificationId,
      [`${channel}.attempts`]: { $lt: maxAttempts },
      $or: [
        {
          [`${channel}.status`]: { $in: ["pending", "failed"] },
          $or: [
            { [`${channel}.nextAttemptAt`]: null },
            { [`${channel}.nextAttemptAt`]: { $lte: now } },
          ],
        },
        {
          [`${channel}.status`]: "processing",
          [`${channel}.lastAttemptAt`]: { $lte: staleProcessingDate },
        },
      ],
    },
    {
      $set: {
        [`${channel}.status`]: "processing",
        [`${channel}.lastAttemptAt`]: now,
      },
      $inc: { [`${channel}.attempts`]: 1 },
    },
    { new: true },
  );
};

const deliverNotification = async (notificationId: string) => {
  const [emailNotification, webhookNotification] = await Promise.all([
    claimDelivery(notificationId, "emailDelivery"),
    claimDelivery(notificationId, "webhookDelivery"),
  ]);

  await Promise.all([
    deliverClaimedChannel(emailNotification, "emailDelivery"),
    deliverClaimedChannel(webhookNotification, "webhookDelivery"),
  ]);
};

const retryPendingDeliveries = async () => {
  const now = new Date();
  const staleProcessingDate = new Date(
    now.getTime() - processingTimeoutMinutes * 60 * 1000,
  );
  const notifications = await Notification.find({
    $or: [
      {
        "emailDelivery.status": { $in: ["pending", "failed"] },
        "emailDelivery.nextAttemptAt": { $lte: now },
        "emailDelivery.attempts": { $lt: maxAttempts },
      },
      {
        "webhookDelivery.status": { $in: ["pending", "failed"] },
        "webhookDelivery.nextAttemptAt": { $lte: now },
        "webhookDelivery.attempts": { $lt: maxAttempts },
      },
      {
        "emailDelivery.status": "processing",
        "emailDelivery.lastAttemptAt": { $lte: staleProcessingDate },
        "emailDelivery.attempts": { $lt: maxAttempts },
      },
      {
        "webhookDelivery.status": "processing",
        "webhookDelivery.lastAttemptAt": { $lte: staleProcessingDate },
        "webhookDelivery.attempts": { $lt: maxAttempts },
      },
    ],
  })
    .select("_id")
    .limit(100);

  await Promise.all(
    notifications.map((notification) =>
      deliverNotification(notification._id.toString()),
    ),
  );

  return { processedNotifications: notifications.length };
};

export const NotificationDeliveryServices = {
  deliverNotification,
  retryPendingDeliveries,
};
