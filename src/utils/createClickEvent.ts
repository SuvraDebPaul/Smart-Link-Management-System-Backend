import { UAParser } from "ua-parser-js";
import { Types } from "mongoose";
import type { Request } from "express";
import { ClickEvent } from "../modules/analytics/analytics.model.js";

export const createClickEvent = async (
  req: Request,
  payload: {
    linkId: Types.ObjectId;
    userId: Types.ObjectId;
    shortCode: string;
  },
) => {
  const userAgent = req.headers["user-agent"] || null;
  const referrer = req.headers.referer || req.headers.referrer || null;

  const parser = new UAParser(userAgent || "");
  const browserResult = parser.getBrowser();
  const osResult = parser.getOS();
  const deviceResult = parser.getDevice();

  const ipAddress = req.ip || req.socket.remoteAddress || null;

  const browser = browserResult.name || "Unknown";
  const os = osResult.name || "Unknown";

  let device = deviceResult.type || "desktop";

  await ClickEvent.create({
    linkId: payload.linkId,
    userId: payload.userId,
    shortCode: payload.shortCode,

    ipAddress,
    userAgent,
    browser,
    os,
    device,
    referrer: typeof referrer === "string" ? referrer : null,
    clickedAt: new Date(),
  });
};
