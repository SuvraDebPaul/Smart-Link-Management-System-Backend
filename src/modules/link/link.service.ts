import { Types } from "mongoose";
import AppError from "../../errors/AppError.js";
import { generateShortCode } from "../../utils/generateShortCode.js";
import { Link } from "./link.model.js";
import config from "../../config/index.js";
import bcrypt from "bcrypt";
import QRCode from "qrcode";
import { User } from "../user/user.model.js";
import { PLAN_LIMITS } from "../../constants/planLimits.js";
import { Campaign } from "../campaign/campaign.model.js";
import { Domain } from "../domain/domain.model.js";
import type { TAuthUser } from "../user/user.interface.js";
import { checkPlanLimit } from "../../utils/checkPlanLimit.js";
import { NotificationServices } from "../notification/notification.service.js";

const reservedAliases = [
  "api",
  "admin",
  "dashboard",
  "login",
  "register",
  "pricing",
  "terms",
  "privacy",
  "settings",
  "auth",
  "links",
];
const guestLinkLifetimeMs = 7 * 24 * 60 * 60 * 1000;

const normalizeHost = (host: string) => {
  return host
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/:\d+$/, "")
    .trim();
};

const validateDomainOwnership = async (domainId: string, userId: string) => {
  const domain = await Domain.findOne({
    _id: new Types.ObjectId(domainId),
    userId: new Types.ObjectId(userId),
    status: "verified",
    isActive: true,
  });

  if (!domain) {
    throw new AppError(
      404,
      "Verified active domain not found. Please verify or activate the domain first.",
    );
  }

  return domain;
};

const validateCampaignOwnership = async (
  campaignId: string,
  userId: string,
) => {
  const campaign = await Campaign.findOne({
    _id: new Types.ObjectId(campaignId),
    userId: new Types.ObjectId(userId),
  });

  if (!campaign) {
    throw new AppError(404, "Campaign not found");
  }

  return campaign;
};

export const buildLinkResponse = (link: any) => {
  const domainDoc = link.domainId;

  const isDomainUsable =
    domainDoc &&
    typeof domainDoc === "object" &&
    domainDoc.domain &&
    domainDoc.status === "verified" &&
    domainDoc.isActive === true;

  const defaultShortUrl = `${config.base_url}/${link.shortCode}`;

  const customShortUrl = isDomainUsable
    ? `https://${domainDoc.domain}/${link.shortCode}`
    : null;

  return {
    id: link._id,
    campaignId: link.campaignId ?? null,
    domainId: domainDoc?._id ?? domainDoc ?? null,

    domain: isDomainUsable
      ? {
          id: domainDoc._id,
          domain: domainDoc.domain,
          status: domainDoc.status,
          isActive: domainDoc.isActive,
        }
      : null,

    originalUrl: link.originalUrl,
    shortCode: link.shortCode,

    shortUrl: customShortUrl || defaultShortUrl,
    defaultShortUrl,
    customShortUrl,

    clicks: link.clicks,
    isActive: link.isActive,
    isPasswordProtected: link.isPasswordProtected,
    expiresAt: link.expiresAt ?? null,
    maxClicks: link.maxClicks ?? null,

    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  };
};

const validateLinkAvailability = (link: any) => {
  if (!link.isActive) {
    throw new AppError(410, "This link is no longer active");
  }

  if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
    throw new AppError(410, "This link has expired");
  }

  if (link.maxClicks && link.clicks >= link.maxClicks) {
    throw new AppError(410, "This link has reached maximum click limit");
  }
};
const incrementLinkClicks = async (linkId: Types.ObjectId) => {
  const updatedLink = await Link.findOneAndUpdate(
    {
      _id: linkId,
      isActive: true,
      $and: [
        {
          $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
        },
        {
          $or: [
            { maxClicks: null },
            { $expr: { $lt: ["$clicks", "$maxClicks"] } },
          ],
        },
      ],
    },
    { $inc: { clicks: 1 } },
    { new: true },
  );

  if (!updatedLink) {
    throw new AppError(410, "This link is no longer available");
  }

  if (
    updatedLink.userId &&
    updatedLink.maxClicks &&
    updatedLink.clicks === updatedLink.maxClicks
  ) {
    await NotificationServices.createNotification({
      userId: updatedLink.userId,
      type: "link-max-clicks",
      title: "Link reached its click limit",
      message: `Your short link ${updatedLink.shortCode} reached ${updatedLink.maxClicks} clicks.`,
      eventKey: `link-max-clicks:${updatedLink._id.toString()}:${updatedLink.maxClicks}`,
    });
  }

  if (updatedLink.campaignId) {
    const campaign = await Campaign.findById(updatedLink.campaignId);

    if (campaign?.goalClicks) {
      const [{ totalClicks = 0 } = {}] = await Link.aggregate<{
        totalClicks: number;
      }>([
        { $match: { campaignId: campaign._id } },
        { $group: { _id: null, totalClicks: { $sum: "$clicks" } } },
      ]);

      if (totalClicks >= campaign.goalClicks) {
        await NotificationServices.createNotification({
          userId: campaign.userId,
          type: "campaign-goal",
          title: "Campaign goal reached",
          message: `${campaign.name} reached its ${campaign.goalClicks}-click goal.`,
          eventKey: `campaign-goal:${campaign._id.toString()}:${campaign.goalClicks}`,
        });
      }
    }
  }
};

const createLinkIntoDB = async (
  payload: {
    originalUrl: string;
    customAlias?: string;
    password?: string;
    expiresAt?: string;
    maxClicks?: number;
    campaignId?: string | null;
    domainId?: string | null;
  },
  userPayload: TAuthUser,
) => {
  const userObjectId = new Types.ObjectId(userPayload.id);
  const totalLinks = await Link.countDocuments({
    userId: userObjectId,
  });
  checkPlanLimit({
    plan: userPayload.plan,
    subscriptionStatus: userPayload.subscriptionStatus,
    key: "links",
    currentUsage: totalLinks,
  });

  let shortCode = payload.customAlias || generateShortCode();
  let domainObjectId = null;
  let passwordHash: string | null = null;
  let campaignObjectId = null;

  if (reservedAliases.includes(shortCode.toLowerCase())) {
    throw new AppError(400, "This alias is reserved. Please use another one.");
  }

  if (payload.domainId) {
    await validateDomainOwnership(payload.domainId, userPayload.id);
    domainObjectId = new Types.ObjectId(payload.domainId);
  }

  const existingShortCode = await Link.findOne({
    shortCode,
    domainId: domainObjectId,
  });

  if (existingShortCode) {
    throw new AppError(409, "This short code or alias is already taken");
  }

  if (payload.password) {
    passwordHash = await bcrypt.hash(payload.password, 12);
  }

  if (payload.campaignId) {
    await validateCampaignOwnership(payload.campaignId, userPayload.id);
    campaignObjectId = new Types.ObjectId(payload.campaignId);
  }

  const result = await Link.create({
    userId: userObjectId,
    campaignId: campaignObjectId,
    domainId: domainObjectId,
    originalUrl: payload.originalUrl,
    shortCode,
    isPasswordProtected: Boolean(payload.password),
    passwordHash,
    expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
    maxClicks: payload.maxClicks ?? null,
  });

  const populatedResult = await result.populate("domainId");

  return buildLinkResponse(populatedResult);
};

const createGuestLinkIntoDB = async (payload: {
  originalUrl: string;
  customAlias?: string;
  password?: string;
  expiresAt?: string;
}) => {
  const now = new Date();
  const maximumExpiry = new Date(now.getTime() + guestLinkLifetimeMs);
  const expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : maximumExpiry;

  if (expiresAt <= now) {
    throw new AppError(400, "Guest link expiration must be in the future");
  }

  if (expiresAt > maximumExpiry) {
    throw new AppError(400, "Guest links can remain active for up to 7 days");
  }

  const shortCode = payload.customAlias || generateShortCode();

  if (reservedAliases.includes(shortCode.toLowerCase())) {
    throw new AppError(400, "This alias is reserved. Please use another one.");
  }

  const existingShortCode = await Link.findOne({
    shortCode,
    domainId: null,
  });

  if (existingShortCode) {
    throw new AppError(409, "This short code or alias is already taken");
  }

  const passwordHash = payload.password
    ? await bcrypt.hash(payload.password, 12)
    : null;

  const result = await Link.create({
    userId: null,
    isGuest: true,
    campaignId: null,
    domainId: null,
    originalUrl: payload.originalUrl,
    shortCode,
    isPasswordProtected: Boolean(payload.password),
    passwordHash,
    expiresAt,
    maxClicks: null,
  });

  return buildLinkResponse(result);
};

const getMyLinksFromDB = async (userId: string) => {
  const result = await Link.find({
    userId: new Types.ObjectId(userId),
  })
    .populate("domainId")
    .sort({
      createdAt: -1,
    });

  return result.map((link) => buildLinkResponse(link));
};

const getSingleLinkFromDB = async (id: string, userId: string) => {
  const result = await Link.findOne({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
  }).populate("domainId");

  if (!result) {
    throw new AppError(404, "Link not found");
  }

  return buildLinkResponse(result);
};

const updateLinkIntoDB = async (
  id: string,
  userId: string,
  payload: {
    originalUrl?: string;
    customAlias?: string;
    isActive?: boolean;
    password?: string;
    removePassword?: boolean;
    expiresAt?: string | null;
    maxClicks?: number | null;
    campaignId?: string | null;
    domainId?: string | null;
  },
) => {
  const link = await Link.findOne({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
  }).select("+passwordHash");

  if (!link) {
    throw new AppError(404, "Link Not Found");
  }

  if (payload.customAlias) {
    const newShortCode = payload.customAlias;
    if (reservedAliases.includes(newShortCode.toLowerCase())) {
      throw new AppError(
        400,
        "This alias is reserved. Please use another one.",
      );
    }
    link.shortCode = newShortCode;
  }

  if (payload.originalUrl) {
    link.originalUrl = payload.originalUrl;
  }

  if (typeof payload.isActive === "boolean") {
    link.isActive = payload.isActive;
  }

  if (payload.password) {
    link.passwordHash = await bcrypt.hash(payload.password, 12);
    link.isPasswordProtected = true;
  }

  if (payload.removePassword === true) {
    link.passwordHash = null;
    link.isPasswordProtected = false;
  }

  if (payload.expiresAt !== undefined) {
    link.expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;
  }

  if (payload.maxClicks !== undefined) {
    link.maxClicks = payload.maxClicks === null ? null : payload.maxClicks;
  }

  if (payload.campaignId !== undefined) {
    if (payload.campaignId === null) {
      link.campaignId = null;
    } else {
      await validateCampaignOwnership(payload.campaignId, userId);
      link.campaignId = new Types.ObjectId(payload.campaignId);
    }
  }

  if (payload.domainId !== undefined) {
    if (payload.domainId === null) {
      link.domainId = null;
    } else {
      await validateDomainOwnership(payload.domainId, userId);
      link.domainId = new Types.ObjectId(payload.domainId);
    }
  }

  const duplicateLink = await Link.findOne({
    shortCode: link.shortCode,
    domainId: link.domainId ?? null,
    _id: { $ne: new Types.ObjectId(id) },
  });

  if (duplicateLink) {
    throw new AppError(
      409,
      "This short code or alias is already taken for this domain",
    );
  }

  const result = await link.save();

  const populatedResult = await result.populate("domainId");

  return buildLinkResponse(populatedResult);
};

const deleteLinkFromDB = async (id: string, userId: string) => {
  const result = await Link.findOneAndDelete({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
  });

  if (!result) {
    throw new AppError(404, "Link not found");
  }

  return buildLinkResponse(result);
};

const redirectLinkByHostFromDB = async (shortCode: string, host: string) => {
  const normalizedHost = normalizeHost(host);

  const domain = await Domain.findOne({
    domain: normalizedHost,
    status: "verified",
    isActive: true,
  });

  const isDefaultHost = normalizedHost === normalizeHost(config.base_url);
  if (!domain && !isDefaultHost) {
    throw new AppError(404, "Domain not found");
  }

  const link = await Link.findOne({
    shortCode,
    domainId: domain?._id ?? null,
  });

  if (!link) {
    throw new AppError(404, "Short link not found");
  }

  validateLinkAvailability(link);

  if (link.isPasswordProtected) {
    return {
      requiresPassword: true,
      shortCode: link.shortCode,
      originalUrl: null,
      linkId: link._id,
      userId: link.userId,
    };
  }

  await incrementLinkClicks(link._id);

  return {
    requiresPassword: false,
    shortCode: link.shortCode,
    originalUrl: link.originalUrl,
    linkId: link._id,
    userId: link.userId,
  };
};

const unlockPasswordProtectedLinkFromDB = async (
  shortCode: string,
  password: string,
  host: string,
) => {
  const normalizedHost = normalizeHost(host);

  const domain = await Domain.findOne({
    domain: normalizedHost,
    status: "verified",
    isActive: true,
  });
  const isDefaultHost = normalizedHost === normalizeHost(config.base_url);

  if (!domain && !isDefaultHost) {
    throw new AppError(404, "Domain not found");
  }

  const link = await Link.findOne({
    shortCode,
    domainId: domain?._id ?? null,
  }).select("+passwordHash");

  if (!link) {
    throw new AppError(404, "Short link not found");
  }

  validateLinkAvailability(link);

  if (!link.isPasswordProtected || !link.passwordHash) {
    throw new AppError(400, "This link is not password protected");
  }

  const isPasswordMatched = await bcrypt.compare(password, link.passwordHash);

  if (!isPasswordMatched) {
    throw new AppError(401, "Invalid password");
  }
  await incrementLinkClicks(link._id);

  return {
    originalUrl: link.originalUrl,
    shortCode: link.shortCode,
    linkId: link._id,
    userId: link.userId,
  };
};

const generateQrCodeFromDB = async (id: string, userId: string) => {
  const link = await Link.findOne({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
  }).populate("domainId");

  if (!link) {
    throw new AppError(404, "Link not found");
  }

  const linkResponse = buildLinkResponse(link);
  const shortUrl = linkResponse.shortUrl;
  const user = await User.findById(userId).select("plan qrDefaultPreferences");
  const preferences =
    user && PLAN_LIMITS[user.plan].qrCustomization === "advanced"
      ? user.qrDefaultPreferences
      : undefined;
  const foregroundColor = preferences?.foregroundColor ?? "#0ea5e9";
  const backgroundColor = preferences?.backgroundColor ?? "#ffffff";
  const size = preferences?.size ?? 500;
  const downloadFormat = preferences?.downloadFormat ?? "png";

  const qrCode =
    downloadFormat === "svg"
      ? await QRCode.toString(shortUrl, {
          type: "svg",
          margin: 2,
          width: size,
          color: {
            dark: foregroundColor,
            light: backgroundColor,
          },
        })
      : await QRCode.toDataURL(shortUrl, {
          type: "image/png",
          margin: 2,
          width: size,
          color: {
            dark: foregroundColor,
            light: backgroundColor,
          },
        });

  return {
    shortUrl,
    qrCode,
    downloadFormat,
  };
};

export const LinkServices = {
  createLinkIntoDB,
  createGuestLinkIntoDB,
  getMyLinksFromDB,
  getSingleLinkFromDB,
  updateLinkIntoDB,
  deleteLinkFromDB,
  redirectLinkByHostFromDB,
  unlockPasswordProtectedLinkFromDB,
  generateQrCodeFromDB,
};
