import Stripe from "stripe";

import config from "../../config/index.js";
import AppError from "../../errors/AppError.js";
import { User } from "../user/user.model.js";
import type {
  TSubscriptionStatus,
  TUserPlan,
} from "../user/user.interface.js";
import { NotificationServices } from "../notification/notification.service.js";

const getStripeSecret = (value: string | undefined, name: string) => {
  if (!value) {
    throw new AppError(503, `${name} is not configured`);
  }

  return value;
};

const getStripeClient = () => {
  return new Stripe(getStripeSecret(config.stripe_secret_key, "Stripe secret key"));
};

type TBillingPlan = Exclude<TUserPlan, "free">;
type TBillingInterval = "monthly" | "yearly";

const getStripePriceId = (
  plan: TBillingPlan,
  billingInterval: TBillingInterval = "monthly",
) => {
  if (plan === "lifetime") {
    return getStripeSecret(config.stripe_lifetime_price_id, "Stripe Lifetime price");
  }

  if (plan === "starter") {
    return getStripeSecret(
      billingInterval === "yearly"
        ? config.stripe_starter_yearly_price_id
        : config.stripe_starter_monthly_price_id,
      `Stripe Starter ${billingInterval} price`,
    );
  }

  return getStripeSecret(
    billingInterval === "yearly"
      ? config.stripe_pro_yearly_price_id
      : config.stripe_pro_monthly_price_id,
    `Stripe Pro ${billingInterval} price`,
  );
};

const getPlanFromPriceId = (
  priceId: string,
): TBillingPlan | null => {
  if (
    priceId === config.stripe_starter_monthly_price_id ||
    priceId === config.stripe_starter_yearly_price_id
  ) {
    return "starter";
  }

  if (
    priceId === config.stripe_pro_monthly_price_id ||
    priceId === config.stripe_pro_yearly_price_id
  ) {
    return "pro";
  }

  if (priceId === config.stripe_lifetime_price_id) return "lifetime";

  return null;
};

const getBillingIntervalFromPriceId = (
  priceId?: string,
): TBillingInterval | null => {
  if (
    priceId === config.stripe_starter_yearly_price_id ||
    priceId === config.stripe_pro_yearly_price_id
  ) {
    return "yearly";
  }

  if (
    priceId === config.stripe_starter_monthly_price_id ||
    priceId === config.stripe_pro_monthly_price_id
  ) {
    return "monthly";
  }

  return null;
};

const getPlanFromSubscription = (subscription: Stripe.Subscription) => {
  const metadataPlan = subscription.metadata.plan;

  if (metadataPlan === "starter" || metadataPlan === "pro") {
    return metadataPlan;
  }

  const priceId = subscription.items.data[0]?.price.id;

  return priceId ? getPlanFromPriceId(priceId) : null;
};

const synchronizeLifetimePurchase = async (session: Stripe.Checkout.Session) => {
  if (session.payment_status !== "paid" || session.metadata?.plan !== "lifetime") {
    return;
  }

  const appUserId = session.metadata.appUserId || session.client_reference_id;
  if (!appUserId) return;

  const user = await User.findById(appUserId);
  if (!user) return;

  const previousPlan = user.plan;
  user.plan = "lifetime";
  user.subscriptionStatus = "active";
  user.subscriptionProvider = "stripe";
  user.subscriptionId = null;
  user.stripeCustomerId = getStripeCustomerId(session.customer);
  user.currentPeriodStart = new Date();
  user.currentPeriodEnd = null;
  user.cancelAtPeriodEnd = false;
  user.billingInterval = "lifetime";
  await user.save();

  if (previousPlan !== "lifetime") {
    await NotificationServices.createNotification({
      userId: user._id,
      type: "billing-subscription",
      title: "Lifetime plan activated",
      message: "Your Lifetime plan is active. Your account no longer requires subscription renewal.",
      eventKey: `billing-lifetime:${session.id}`,
    });
  }
};

const mapSubscriptionStatus = (
  status: Stripe.Subscription.Status,
): TSubscriptionStatus => {
  if (status === "active") return "active";
  if (status === "trialing") return "trialing";
  if (status === "canceled") return "cancelled";

  return "past_due";
};

const getStripeCustomerId = (
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
) => {
  if (!customer) return null;

  return typeof customer === "string" ? customer : customer.id;
};

const synchronizeSubscription = async (subscription: Stripe.Subscription) => {
  const subscriptionItem = subscription.items.data[0];
  const appUserId = subscription.metadata.appUserId;
  const customerId = getStripeCustomerId(subscription.customer);

  const user = await User.findOne(
    appUserId
      ? { _id: appUserId }
      : {
          $or: [
            { subscriptionId: subscription.id },
            { stripeCustomerId: customerId },
          ],
        },
  );

  if (!user) {
    return;
  }

  if (user.plan === "lifetime" && user.subscriptionStatus === "active") {
    return;
  }

  const status = mapSubscriptionStatus(subscription.status);
  const plan =
    status === "cancelled" ? "free" : getPlanFromSubscription(subscription);

  if (!plan) {
    return;
  }

  const previousPlan = user.plan;
  const previousStatus = user.subscriptionStatus;

  user.plan = plan;
  user.subscriptionStatus = status;
  user.subscriptionProvider = "stripe";
  user.subscriptionId = subscription.id;
  user.stripeCustomerId = customerId;
  user.currentPeriodStart = subscriptionItem?.current_period_start
    ? new Date(subscriptionItem.current_period_start * 1000)
    : null;
  user.currentPeriodEnd = subscriptionItem?.current_period_end
    ? new Date(subscriptionItem.current_period_end * 1000)
    : null;
  user.cancelAtPeriodEnd = subscription.cancel_at_period_end;
  user.billingInterval =
    subscription.metadata.billingInterval === "yearly"
      ? "yearly"
      : subscription.metadata.billingInterval === "monthly"
        ? "monthly"
        : getBillingIntervalFromPriceId(subscriptionItem?.price.id);

  await user.save();

  if (previousPlan !== plan || previousStatus !== status) {
    await NotificationServices.createNotification({
      userId: user._id,
      type: "billing-subscription",
      title: "Subscription updated",
      message: `Your subscription is now ${plan} (${status}).`,
      eventKey: `billing-subscription:${subscription.id}:${plan}:${status}`,
    });
  }
};

const createCheckoutSession = async (
  userId: string,
  plan: TBillingPlan,
  billingInterval: TBillingInterval = "monthly",
) => {
  const stripe = getStripeClient();

  const user = await User.findById(userId);

  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (user.plan === "lifetime" && user.subscriptionStatus === "active") {
    throw new AppError(409, "Your Lifetime plan is already active");
  }

  if (
    user.subscriptionProvider === "stripe" &&
    user.subscriptionId &&
    ["active", "trialing", "past_due"].includes(user.subscriptionStatus)
  ) {
    throw new AppError(409, "Manage your existing subscription from billing");
  }

  const isLifetime = plan === "lifetime";
  const session = await stripe.checkout.sessions.create({
    mode: isLifetime ? "payment" : "subscription",
    success_url: `${config.frontend_url}/dashboard/settings?tab=subscription&checkout=success`,
    cancel_url: `${config.frontend_url}/dashboard/settings?tab=subscription&checkout=cancelled`,
    client_reference_id: user._id.toString(),
    ...(user.stripeCustomerId
      ? { customer: user.stripeCustomerId }
      : { customer_email: user.email }),
    ...(!user.stripeCustomerId && isLifetime ? { customer_creation: "always" as const } : {}),
    line_items: [
      {
        price: getStripePriceId(plan, billingInterval),
        quantity: 1,
      },
    ],
    metadata: {
      appUserId: user._id.toString(),
      plan,
      billingInterval: isLifetime ? "lifetime" : billingInterval,
    },
    ...(!isLifetime
      ? {
          subscription_data: {
            metadata: {
              appUserId: user._id.toString(),
              plan,
              billingInterval,
            },
          },
        }
      : {}),
  });

  if (!session.url) {
    throw new AppError(502, "Stripe Checkout URL was not created");
  }

  return {
    url: session.url,
  };
};

const createPortalSession = async (userId: string) => {
  const stripe = getStripeClient();

  const user = await User.findById(userId);

  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (!user.stripeCustomerId) {
    throw new AppError(400, "No Stripe billing account found");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${config.frontend_url}/dashboard/settings?tab=subscription`,
  });

  return {
    url: session.url,
  };
};

const cancelSubscriptionForAccountDeletion = async (
  betterAuthUserId: string,
) => {
  const user = await User.findOne({ betterAuthUserId });

  if (
    !user ||
    user.subscriptionProvider !== "stripe" ||
    !user.subscriptionId ||
    user.subscriptionStatus === "cancelled"
  ) {
    return;
  }

  const stripe = getStripeClient();

  await stripe.subscriptions.cancel(user.subscriptionId);
};

const handleStripeWebhook = async (
  payload: Buffer,
  signature: string | string[] | undefined,
) => {
  const stripe = getStripeClient();
  const webhookSecret = getStripeSecret(
    config.stripe_webhook_secret,
    "Stripe webhook secret",
  );

  if (!signature || Array.isArray(signature)) {
    throw new AppError(400, "Stripe signature is missing");
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    throw new AppError(400, "Stripe webhook signature verification failed");
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    await synchronizeSubscription(event.data.object);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;

    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await synchronizeSubscription(subscription);
    } else {
      await synchronizeLifetimePurchase(session);
    }
  }
};

export const BillingServices = {
  createCheckoutSession,
  createPortalSession,
  cancelSubscriptionForAccountDeletion,
  handleStripeWebhook,
};
