import type { Document, Types } from "mongoose";

export type TUserRole = "user" | "admin";

export type TUserPlan = "free" | "starter" | "pro";

export type TSubscriptionStatus =
  | "none"
  | "active"
  | "trialing"
  | "past_due"
  | "cancelled";

export type TNotificationPreferences = {
  weeklyAnalyticsReport: boolean;
  campaignGoalReached: boolean;
  linkMaxClicksReached: boolean;
  domainVerificationFailed: boolean;
  securityLoginAlert: boolean;
  billingSubscriptionAlert: boolean;
};

export type TApiSecurityPreferences = {
  defaultApiKeyExpiryDays: number | null;
  allowedIpAddresses: string[];
  webhookUrl: string | null;
};

export type TQrDefaultPreferences = {
  foregroundColor: string;
  backgroundColor: string;
  size: number;
  downloadFormat: "png" | "svg";
};

export interface IUser extends Document {
  name: string;
  email: string;
  betterAuthUserId: string;

  role: TUserRole;
  plan: TUserPlan;
  subscriptionStatus: TSubscriptionStatus;

  subscriptionProvider: "manual" | "stripe" | "sslcommerz" | "paddle" | null;
  subscriptionId: string | null;
  stripeCustomerId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;

  companyName?: string | null;
  timezone?: string | null;
  notificationPreferences: TNotificationPreferences;
  apiSecurityPreferences: TApiSecurityPreferences;
  qrDefaultPreferences: TQrDefaultPreferences;

  isVerified: boolean;
}

export interface TAuthUser {
  id: string;
  email: string;
  role: TUserRole;
  plan: TUserPlan;
  subscriptionStatus: TSubscriptionStatus;
}
