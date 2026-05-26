import type { Request } from "express";
import { Types } from "mongoose";
import { UAParser } from "ua-parser-js";
import { PageLinkClick } from "../modules/pageVisit/pageLinkClick.model.js";

export const createPageLinkClick = async (
  req: Request,
  payload: {
    pageId: Types.ObjectId;
    userId: Types.ObjectId;
    slug: string;
    linkIndex: number;
    linkTitle: string;
    linkUrl: string;
  },
) => {
  const userAgent = req.headers["user-agent"] || null;
  const referrer = req.headers.referer || req.headers.referrer || null;

  const parser = new UAParser(String(userAgent || ""));

  const browserResult = parser.getBrowser();
  const osResult = parser.getOS();
  const deviceResult = parser.getDevice();

  const ipAddress = req.ip || req.socket.remoteAddress || null;

  await PageLinkClick.create({
    pageId: payload.pageId,
    userId: payload.userId,
    slug: payload.slug,

    linkIndex: payload.linkIndex,
    linkTitle: payload.linkTitle,
    linkUrl: payload.linkUrl,

    ipAddress,
    userAgent: typeof userAgent === "string" ? userAgent : null,
    browser: browserResult.name || "Unknown",
    os: osResult.name || "Unknown",
    device: deviceResult.type || "desktop",
    referrer: typeof referrer === "string" ? referrer : null,
    clickedAt: new Date(),
  });
};
