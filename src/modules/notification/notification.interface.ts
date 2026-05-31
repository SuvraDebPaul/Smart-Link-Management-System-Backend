import type { Types } from "mongoose";

export type TNotificationType =
  | "campaign-goal"
  | "link-max-clicks"
  | "domain-verification-failed"
  | "billing-subscription"
  | "weekly-analytics"
  | "login-security";

export type TDeliveryStatus = "pending" | "processing" | "sent" | "failed" | "skipped";

export type TDeliveryState = {
  status: TDeliveryStatus;
  attempts: number;
  nextAttemptAt: Date | null;
  lastAttemptAt: Date | null;
  deliveredAt: Date | null;
  lastError: string | null;
};

export interface INotification {
  userId: Types.ObjectId;
  type: TNotificationType;
  title: string;
  message: string;
  eventKey: string;
  isRead: boolean;
  recipientEmail: string | null;
  webhookUrl: string | null;
  emailDelivery: TDeliveryState;
  webhookDelivery: TDeliveryState;
  createdAt: Date;
  updatedAt: Date;
}
