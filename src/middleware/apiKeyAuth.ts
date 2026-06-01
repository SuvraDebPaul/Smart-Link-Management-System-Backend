import type { NextFunction, Request, Response } from "express";
import AppError from "../errors/AppError.js";
import { hashApiKey } from "../modules/apiKey/apiKey.utils.js";
import { ApiKey } from "../modules/apiKey/apiKey.model.js";
import { User } from "../modules/user/user.model.js";

const normalizeIpAddress = (value: string) => {
  return value.startsWith("::ffff:") ? value.slice(7) : value;
};

const apiKeyAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || typeof apiKey !== "string") {
      throw new AppError(401, "API key is required");
    }

    if (!apiKey.startsWith("sk_live_")) {
      throw new AppError(401, "Invalid API key format");
    }

    const keyHash = hashApiKey(apiKey);

    const storedApiKey = await ApiKey.findOne({
      keyHash,
      isActive: true,
    }).select("+keyHash");

    if (!storedApiKey) {
      throw new AppError(401, "Invalid or inactive API key");
    }

    if (storedApiKey.expiresAt && storedApiKey.expiresAt <= new Date()) {
      throw new AppError(401, "API key has expired");
    }

    const user = await User.findById(storedApiKey.user).select(
      "_id name email role plan subscriptionStatus apiSecurityPreferences.allowedIpAddresses",
    );

    if (!user) {
      throw new AppError(401, "API key owner not found");
    }

    const hasActivePaidSubscription =
      ["starter", "pro", "lifetime"].includes(user.plan) &&
      ["active", "trialing"].includes(user.subscriptionStatus);

    if (!hasActivePaidSubscription) {
      throw new AppError(
        403,
        "Your subscription does not include active API key access",
      );
    }

    const allowedIpAddresses =
      user.apiSecurityPreferences?.allowedIpAddresses ?? [];
    const requestIp = normalizeIpAddress(
      req.ip || req.socket.remoteAddress || "",
    );

    if (
      allowedIpAddresses.length > 0 &&
      !allowedIpAddresses.includes(requestIp)
    ) {
      throw new AppError(403, "Your IP address is not allowed to use this API key");
    }

    await ApiKey.findByIdAndUpdate(storedApiKey._id, {
      lastUsedAt: new Date(),
    });

    (req as any).user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      plan: user.plan || "free",
      subscriptionStatus: user.subscriptionStatus || "none",
    };

    next();
  } catch (error) {
    next(error);
  }
};

export default apiKeyAuth;
