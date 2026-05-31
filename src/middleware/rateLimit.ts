import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request, Response } from "express";
import { hashApiKey } from "../modules/apiKey/apiKey.utils.js";

const rateLimitHandler = (req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    message: "Too many requests. Please try again later.",
  });
};

export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: "Too many authentication attempts. Please try again later.",
    });
  },
});

export const linkCreateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: "Too many links created. Please try again later.",
    });
  },
});

export const apiKeyBasedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req: Request) => {
    const apiKey = req.headers["x-api-key"];

    if (typeof apiKey === "string") {
      return hashApiKey(apiKey);
    }

    return ipKeyGenerator(req.ip || "unknown-ip");
  },

  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: "API key rate limit exceeded. Please try again later.",
    });
  },
});

export const redirectLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: "Too many redirect requests. Please slow down.",
    });
  },
});

export const linkUnlockLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: "Too many unlock attempts. Please try again later.",
    });
  },
});
