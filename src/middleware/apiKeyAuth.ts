import type { NextFunction, Request, Response } from "express";
import AppError from "../errors/AppError.js";
import { hashApiKey } from "../modules/apiKey/apiKey.utils.js";
import { ApiKey } from "../modules/apiKey/apiKey.model.js";
import { User } from "../modules/user/user.model.js";

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

    const user = await User.findById(storedApiKey.user).select(
      "_id name email role",
    );

    if (!user) {
      throw new AppError(401, "API key owner not found");
    }

    await ApiKey.findByIdAndUpdate(storedApiKey._id, {
      lastUsedAt: new Date(),
    });

    (req as any).user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export default apiKeyAuth;
