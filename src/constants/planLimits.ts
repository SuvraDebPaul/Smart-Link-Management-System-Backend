export const PLAN_LIMITS = {
  free: {
    links: 25,
    campaigns: 2,
    bioPages: 1,
    customDomains: 0,
    apiKeys: 0,
    analyticsHistoryDays: 7,
    qrCustomization: "basic",
  },

  starter: {
    links: 500,
    campaigns: 25,
    bioPages: 5,
    customDomains: 1,
    apiKeys: 3,
    analyticsHistoryDays: 90,
    qrCustomization: "advanced",
  },

  pro: {
    links: "unlimited",
    campaigns: "unlimited",
    bioPages: "unlimited",
    customDomains: 10,
    apiKeys: 20,
    analyticsHistoryDays: "unlimited",
    qrCustomization: "advanced",
  },
} as const;

export type TPlan = keyof typeof PLAN_LIMITS;

export type TSubscriptionStatus =
  | "none"
  | "active"
  | "trialing"
  | "past_due"
  | "cancelled";

export type TLimitKey =
  | "links"
  | "campaigns"
  | "bioPages"
  | "customDomains"
  | "apiKeys";
