import type { NextFunction, Request, Response } from "express";
import AppError from "../errors/AppError.js";

const blockedUserAgents = ["curl", "wget", "python-requests", "scrapy"];

const botProtection = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.headers["user-agent"];

  if (!userAgent || typeof userAgent !== "string") {
    throw new AppError(403, "Missing user agent is not allowed");
  }

  const lowerUserAgent = userAgent.toLowerCase();

  const isBlocked = blockedUserAgents.some((agent) =>
    lowerUserAgent.includes(agent),
  );

  if (isBlocked) {
    throw new AppError(403, "Automated traffic is not allowed");
  }

  next();
};

export default botProtection;
