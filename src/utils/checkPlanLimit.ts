import AppError from "../errors/AppError.js";
import {
  PLAN_LIMITS,
  type TLimitKey,
  type TPlan,
  type TSubscriptionStatus,
} from "../constants/planLimits.js";

const paidPlans: TPlan[] = ["starter", "pro"];

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
