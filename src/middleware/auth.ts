import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";

import AppError from "../errors/AppError.js";
import { betterAuthInstance } from "../modules/auth/better-auth.js";
import { User } from "../modules/user/user.model.js";
import type { TAuthUser, TUserRole } from "../modules/user/user.interface.js";

declare global {
  namespace Express {
    interface Request {
      user?: TAuthUser;
    }
  }
}

const getOrCreateAppUser = async (sessionUser: {
  id: string;
  email?: string | null;
  name?: string | null;
  emailVerified?: boolean | null;
}) => {
  if (!sessionUser.email) {
    throw new AppError(401, "Session email not found");
  }

  const userEmail = sessionUser.email.toLowerCase().trim();

  const fallbackName = userEmail.split("@")[0] || "User";

  const userName =
    typeof sessionUser.name === "string" && sessionUser.name.trim().length > 0
      ? sessionUser.name.trim()
      : fallbackName;

  const existingUser = await User.findOne({
    betterAuthUserId: sessionUser.id,
  });

  if (existingUser) {
    if (existingUser.isVerified !== Boolean(sessionUser.emailVerified)) {
      existingUser.isVerified = Boolean(sessionUser.emailVerified);
      await existingUser.save();
    }

    return existingUser;
  }

  const existingUserByEmail = await User.findOne({
    email: userEmail,
  });

  if (existingUserByEmail) {
    existingUserByEmail.betterAuthUserId = sessionUser.id;
    existingUserByEmail.name = existingUserByEmail.name || userName;
    existingUserByEmail.isVerified = Boolean(sessionUser.emailVerified);

    await existingUserByEmail.save();

    return existingUserByEmail;
  }

  const newUser = await User.create({
    name: userName,
    email: userEmail,
    betterAuthUserId: sessionUser.id,

    role: "user",
    plan: "free",
    subscriptionStatus: "none",
    subscriptionProvider: null,
    subscriptionId: null,
    stripeCustomerId: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,

    companyName: null,
    timezone: "Asia/Dhaka",
    notificationPreferences: {
      weeklyAnalyticsReport: true,
      campaignGoalReached: true,
      linkMaxClicksReached: true,
      domainVerificationFailed: true,
      securityLoginAlert: true,
      billingSubscriptionAlert: true,
    },
    apiSecurityPreferences: {
      defaultApiKeyExpiryDays: null,
      allowedIpAddresses: [],
      webhookUrl: null,
    },
    qrDefaultPreferences: {
      foregroundColor: "#0ea5e9",
      backgroundColor: "#ffffff",
      size: 500,
      downloadFormat: "png",
    },
    isVerified: Boolean(sessionUser.emailVerified),
  });

  return newUser;
};

export const auth = (...requiredRoles: TUserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await betterAuthInstance.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session?.user) {
        throw new AppError(401, "You are not authenticated");
      }

      const appUser = await getOrCreateAppUser({
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        emailVerified: session.user.emailVerified,
      });

      if (requiredRoles.length > 0 && !requiredRoles.includes(appUser.role)) {
        throw new AppError(403, "You are not allowed");
      }

      req.user = {
        id: appUser._id.toString(),
        email: appUser.email,
        role: appUser.role,
        plan: appUser.plan || "free",
        subscriptionStatus: appUser.subscriptionStatus || "none",
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};
