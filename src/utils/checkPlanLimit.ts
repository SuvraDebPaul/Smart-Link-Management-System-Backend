import AppError from "../errors/AppError.js";
import {
  PLAN_LIMITS,
  type TLimitKey,
  type TPlan,
  type TSubscriptionStatus,
} from "../constants/planLimits.js";

const paidPlans: TPlan[] = ["starter", "pro", "lifetime"];

export const checkPlanLimit = ({
  plan,
  subscriptionStatus,
  key,
  currentUsage,
}: {
  plan: TPlan;
  subscriptionStatus: TSubscriptionStatus;
  key: TLimitKey;
  currentUsage: number;
}) => {
  const limit = PLAN_LIMITS[plan][key];

  if (
    paidPlans.includes(plan) &&
    !["active", "trialing"].includes(subscriptionStatus)
  ) {
    throw new AppError(
      403,
      `Your ${plan} subscription is not active. Please update your billing to continue using paid features.`,
    );
  }

  if (limit === "unlimited") {
    return;
  }

  if (currentUsage >= limit) {
    throw new AppError(
      403,
      `Your ${plan} plan limit has been reached for ${key}. Please upgrade your plan.`,
    );
  }
};

export const checkPlanFeature = ({
  plan,
  subscriptionStatus,
  feature,
  message,
}: {
  plan: TPlan;
  subscriptionStatus: TSubscriptionStatus;
  feature:
    | "campaignWorkspace"
    | "scheduledCampaignReports"
    | "campaignSharing"
    | "campaignComparison"
    | "linkWorkspace"
    | "smartLinkControls"
    | "linkMonitoring"
    | "conversionTracking";
  message: string;
}) => {
  if (
    paidPlans.includes(plan) &&
    !["active", "trialing"].includes(subscriptionStatus)
  ) {
    throw new AppError(
      403,
      `Your ${plan} plan is not active. Please update your billing to continue using paid features.`,
    );
  }

  if (!PLAN_LIMITS[plan][feature]) {
    throw new AppError(403, message);
  }
};
