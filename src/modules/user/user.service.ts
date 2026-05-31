import { Types } from "mongoose";
import bcrypt from "bcrypt";
import AppError from "../../errors/AppError.js";
import { PLAN_LIMITS } from "../../constants/planLimits.js";
import { User } from "./user.model.js";
import { Link } from "../link/link.model.js";
import { Campaign } from "../campaign/campaign.model.js";
import { Page } from "../page/page.model.js";
import { Domain } from "../domain/domain.model.js";
import { ApiKey } from "../apiKey/apiKey.model.js";
import { ClickEvent } from "../analytics/analytics.model.js";
import type {
  TApiSecurityPreferences,
  TNotificationPreferences,
  TQrDefaultPreferences,
} from "./user.interface.js";
import { PageVisit } from "../pageVisit/pageVisit.model.js";
import { PageLinkClick } from "../pageVisit/pageLinkClick.model.js";
import { getAvailableApiKeyFilter } from "../apiKey/apiKey.service.js";
import { WebhookDeliveryServices } from "../notification/webhook-delivery.service.js";

const defaultNotificationPreferences: TNotificationPreferences = {
  weeklyAnalyticsReport: true,
  campaignGoalReached: true,
  linkMaxClicksReached: true,
  domainVerificationFailed: true,
  securityLoginAlert: true,
  billingSubscriptionAlert: true,
};

const defaultApiSecurityPreferences: TApiSecurityPreferences = {
  defaultApiKeyExpiryDays: null,
  allowedIpAddresses: [],
  webhookUrl: null,
};

const defaultQrDefaultPreferences: TQrDefaultPreferences = {
  foregroundColor: "#0ea5e9",
  backgroundColor: "#ffffff",
  size: 500,
  downloadFormat: "png",
};

const normalizeNotificationPreferences = (
  preferences?: Partial<TNotificationPreferences> | null,
): TNotificationPreferences => ({
  ...defaultNotificationPreferences,
  ...preferences,
});

const normalizeApiSecurityPreferences = (
  preferences?: Partial<TApiSecurityPreferences> | null,
): TApiSecurityPreferences => ({
  ...defaultApiSecurityPreferences,
  ...preferences,
  allowedIpAddresses: preferences?.allowedIpAddresses ?? [],
});

const normalizeQrDefaultPreferences = (
  preferences?: Partial<TQrDefaultPreferences> | null,
): TQrDefaultPreferences => ({
  ...defaultQrDefaultPreferences,
  ...preferences,
});

const getQrDefaultPreferencesForPlan = (
  plan: keyof typeof PLAN_LIMITS,
  preferences?: Partial<TQrDefaultPreferences> | null,
) => {
  return PLAN_LIMITS[plan].qrCustomization === "advanced"
    ? normalizeQrDefaultPreferences(preferences)
    : defaultQrDefaultPreferences;
};

const getMeFromDB = async (userId: string) => {
  const userObjectId = new Types.ObjectId(userId);

  const user = await User.findById(userObjectId).select(
    "name email role plan subscriptionStatus subscriptionProvider subscriptionId currentPeriodStart currentPeriodEnd cancelAtPeriodEnd companyName timezone notificationPreferences apiSecurityPreferences qrDefaultPreferences",
  );

  if (!user) {
    throw new AppError(404, "User not found");
  }

  const [links, campaigns, bioPages, customDomains, apiKeys] =
    await Promise.all([
      Link.countDocuments({ userId: userObjectId }),
      Campaign.countDocuments({ userId: userObjectId }),
      Page.countDocuments({ userId: userObjectId }),
      Domain.countDocuments({ userId: userObjectId }),
      ApiKey.countDocuments({
        user: userObjectId,
        ...getAvailableApiKeyFilter(),
      }),
    ]);

  const plan = user.plan || "free";
  const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionProvider: user.subscriptionProvider,
      subscriptionId: user.subscriptionId,
      currentPeriodStart: user.currentPeriodStart,
      currentPeriodEnd: user.currentPeriodEnd,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd,
      companyName: user.companyName ?? null,
      timezone: user.timezone ?? null,
      notificationPreferences: normalizeNotificationPreferences(
        user.notificationPreferences,
      ),
      apiSecurityPreferences: normalizeApiSecurityPreferences(
        user.apiSecurityPreferences,
      ),
      qrDefaultPreferences: getQrDefaultPreferencesForPlan(
        plan,
        user.qrDefaultPreferences,
      ),
    },

    usage: {
      links,
      campaigns,
      bioPages,
      customDomains,
      apiKeys,
    },

    limits,
  };
};

const updateMeIntoDB = async (
  userId: string,
  payload: {
    name?: string;
    companyName?: string;
    timezone?: string;
    notificationPreferences?: TNotificationPreferences;
    apiSecurityPreferences?: TApiSecurityPreferences;
    qrDefaultPreferences?: TQrDefaultPreferences;
  },
) => {
  const user = await User.findById(new Types.ObjectId(userId));

  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (payload.name !== undefined) {
    user.name = payload.name;
  }

  if (payload.companyName !== undefined) {
    user.companyName = payload.companyName;
  }

  if (payload.timezone !== undefined) {
    user.timezone = payload.timezone;
  }

  if (payload.notificationPreferences !== undefined) {
    user.notificationPreferences = payload.notificationPreferences;
  }

  if (payload.apiSecurityPreferences !== undefined) {
    if (payload.apiSecurityPreferences.webhookUrl) {
      try {
        await WebhookDeliveryServices.validateWebhookDestination(
          payload.apiSecurityPreferences.webhookUrl,
        );
      } catch (error) {
        throw new AppError(
          400,
          error instanceof Error ? error.message : "Webhook URL is not allowed",
        );
      }
    }

    user.apiSecurityPreferences = payload.apiSecurityPreferences;
  }

  if (payload.qrDefaultPreferences !== undefined) {
    if (PLAN_LIMITS[user.plan].qrCustomization !== "advanced") {
      throw new AppError(
        403,
        "Upgrade to Starter or Pro to customize QR defaults",
      );
    }

    user.qrDefaultPreferences = payload.qrDefaultPreferences;
  }

  const result = await user.save();

  return {
    id: result._id,
    name: result.name,
    email: result.email,
    role: result.role,
    plan: result.plan,
    subscriptionStatus: result.subscriptionStatus,
    companyName: result.companyName ?? null,
    timezone: result.timezone ?? null,
    notificationPreferences: normalizeNotificationPreferences(
      result.notificationPreferences,
    ),
    apiSecurityPreferences: normalizeApiSecurityPreferences(
      result.apiSecurityPreferences,
    ),
    qrDefaultPreferences: getQrDefaultPreferencesForPlan(
      result.plan,
      result.qrDefaultPreferences,
    ),
  };
};

export const UserServices = {
  getMeFromDB,
  updateMeIntoDB,
};
