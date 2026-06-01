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
import { checkPlanFeature, checkPlanLimit } from "../../utils/checkPlanLimit.js";
import { NotificationServices } from "../notification/notification.service.js";
import { randomBytes } from "node:crypto";

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

const hasValue = (value: unknown): boolean => {
  if (value === null || value === undefined || value === false || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const validateLinkFeatures = (
  payload: Record<string, unknown>,
  userPayload: TAuthUser,
) => {
  if (["tags", "folder", "notes"].some((key) => hasValue(payload[key]))) {
    checkPlanFeature({
      plan: userPayload.plan,
      subscriptionStatus: userPayload.subscriptionStatus,
      feature: "linkWorkspace",
      message: "Upgrade to Starter, Pro, or Lifetime to organize links with tags, folders, and private notes.",
    });
  }

  if (
    ["password", "startsAt", "expiresAt", "maxClicks"].some((key) =>
      hasValue(payload[key]),
    )
  ) {
    checkPlanFeature({
      plan: userPayload.plan,
      subscriptionStatus: userPayload.subscriptionStatus,
      feature: "smartLinkControls",
      message: "Upgrade to Starter, Pro, or Lifetime to use password protection, scheduling, expiration, and click limits.",
    });
  }
};

const validateLinkFeatureChanges = (
  payload: Record<string, unknown>,
  link: any,
  userPayload: TAuthUser,
) => {
  const hasChangedValue = (key: string, currentValue: unknown) =>
    hasValue(payload[key]) &&
    JSON.stringify(payload[key]) !== JSON.stringify(currentValue ?? null);

  if (
    hasChangedValue("tags", link.tags ?? []) ||
    hasChangedValue("folder", link.folder) ||
    hasChangedValue("notes", link.notes)
  ) {
    checkPlanFeature({
      plan: userPayload.plan,
      subscriptionStatus: userPayload.subscriptionStatus,
      feature: "linkWorkspace",
      message: "Upgrade to Starter, Pro, or Lifetime to organize links with tags, folders, and private notes.",
    });
  }

  if (
    hasChangedValue("password", null) ||
    hasChangedValue("startsAt", link.startsAt?.toISOString()) ||
    hasChangedValue("expiresAt", link.expiresAt?.toISOString()) ||
    hasChangedValue("maxClicks", link.maxClicks)
  ) {
    checkPlanFeature({
      plan: userPayload.plan,
      subscriptionStatus: userPayload.subscriptionStatus,
      feature: "smartLinkControls",
      message: "Upgrade to Starter, Pro, or Lifetime to use password protection, scheduling, expiration, and click limits.",
    });
  }
};

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
    isArchived: { $ne: true },
  });

  if (!campaign) {
    throw new AppError(404, "Current campaign not found");
  }

  return campaign;
};

export const buildLinkResponse = (
  link: any,
  options: { includeConversionToken?: boolean } = {},
) => {
  const domainDoc = link.domainId;
  const campaignDoc = link.campaignId;

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
    campaignId: campaignDoc?._id ?? campaignDoc ?? null,
    domainId: domainDoc?._id ?? domainDoc ?? null,

    campaign:
      campaignDoc &&
      typeof campaignDoc === "object" &&
      campaignDoc.name
        ? {
            id: campaignDoc._id,
            name: campaignDoc.name,
            status: campaignDoc.status,
            startDate: campaignDoc.startDate ?? null,
            endDate: campaignDoc.endDate ?? null,
          }
        : null,

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
    tags: link.tags ?? [],
    folder: link.folder ?? null,
    notes: link.notes ?? null,
    isFavorite: link.isFavorite ?? false,
    isArchived: link.isArchived ?? false,
    defaultShortUrl,
    customShortUrl,

    clicks: link.clicks,
    isActive: link.isActive,
    isPasswordProtected: link.isPasswordProtected,
    startsAt: link.startsAt ?? null,
    expiresAt: link.expiresAt ?? null,
    maxClicks: link.maxClicks ?? null,
    healthStatus: link.healthStatus ?? "unchecked",
    healthStatusCode: link.healthStatusCode ?? null,
    healthCheckedAt: link.healthCheckedAt ?? null,
    conversionToken: options.includeConversionToken ? link.conversionToken : undefined,

    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  };
};

const validateLinkAvailability = (link: any) => {
  if (!link.isActive) {
    throw new AppError(410, "This link is no longer active");
  }

  if (link.startsAt && new Date() < new Date(link.startsAt)) {
    throw new AppError(410, "This link is not active yet");
  }

  if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
    throw new AppError(410, "This link has expired");
  }

  if (link.maxClicks && link.clicks >= link.maxClicks) {
    throw new AppError(410, "This link has reached maximum click limit");
  }
};

const validateCampaignAvailability = async (campaignId?: Types.ObjectId | null) => {
  if (!campaignId) return;

  const campaign = await Campaign.findById(campaignId).select(
    "status startDate endDate",
  );

  if (!campaign) return;

  if (campaign.status === "paused") {
    throw new AppError(410, "This campaign is currently paused");
  }

  if (campaign.status === "completed") {
    throw new AppError(410, "This campaign has ended");
  }

  const now = new Date();

  if (campaign.startDate && now < campaign.startDate) {
    throw new AppError(410, "This campaign has not started yet");
  }

  if (campaign.endDate && now > campaign.endDate) {
    throw new AppError(410, "This campaign has ended");
  }
};

const validateLinkSchedule = (
  startsAt?: Date | null,
  expiresAt?: Date | null,
) => {
  if (startsAt && expiresAt && startsAt >= expiresAt) {
    throw new AppError(400, "Link activation must be before its expiration");
  }
};

const incrementLinkClicks = async (linkId: Types.ObjectId) => {
  const updatedLink = await Link.findOneAndUpdate(
    {
      _id: linkId,
      isActive: true,
      $and: [
        {
          $or: [{ startsAt: null }, { startsAt: { $lte: new Date() } }],
        },
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
    startsAt?: string;
    expiresAt?: string;
    maxClicks?: number;
    campaignId?: string | null;
    domainId?: string | null;
    tags?: string[];
    folder?: string | null;
    notes?: string | null;
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
  validateLinkFeatures(payload, userPayload);

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

  const startsAt = payload.startsAt ? new Date(payload.startsAt) : null;
  const expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;
  validateLinkSchedule(startsAt, expiresAt);

  const result = await Link.create({
    userId: userObjectId,
    campaignId: campaignObjectId,
    domainId: domainObjectId,
    originalUrl: payload.originalUrl,
    shortCode,
    isPasswordProtected: Boolean(payload.password),
    passwordHash,
    startsAt,
    expiresAt,
    maxClicks: payload.maxClicks ?? null,
    tags: normalizeTags(payload.tags),
    folder: payload.folder?.trim() || null,
    notes: payload.notes?.trim() || null,
  });

  const populatedResult = await result.populate([
    { path: "domainId" },
    { path: "campaignId", select: "name status startDate endDate" },
  ]);

  return buildLinkResponse(populatedResult);
};

const normalizeTags = (tags?: string[]) => {
  return [...new Set((tags ?? []).map((tag) => tag.trim().toLowerCase()))];
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

const createBulkLinksIntoDB = async (
  links: {
    originalUrl: string;
    customAlias?: string;
    startsAt?: string;
    expiresAt?: string;
    maxClicks?: number;
    tags?: string[];
    folder?: string | null;
    notes?: string | null;
  }[],
  userPayload: TAuthUser,
) => {
  const created = [];
  const errors: { row: number; originalUrl: string; message: string }[] = [];

  for (const [index, link] of links.entries()) {
    try {
      created.push(await createLinkIntoDB(link, userPayload));
    } catch (error) {
      errors.push({
        row: index + 2,
        originalUrl: link.originalUrl,
        message:
          error instanceof Error ? error.message : "Failed to create link",
      });
    }
  }

  return { created, errors };
};

const getMyLinksFromDB = async (userId: string) => {
  const result = await Link.find({
    userId: new Types.ObjectId(userId),
  })
    .populate("domainId")
    .populate("campaignId", "name status startDate endDate")
    .sort({
      createdAt: -1,
    });

  return result.map((link) => buildLinkResponse(link));
};

const getSingleLinkFromDB = async (id: string, userId: string) => {
  const result = await Link.findOne({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
  })
    .populate("domainId")
    .populate("campaignId", "name status startDate endDate");

  if (!result) {
    throw new AppError(404, "Link not found");
  }
  const user = await User.findById(userId).select("plan subscriptionStatus");
  const includeConversionToken = Boolean(
    user &&
      ["pro", "lifetime"].includes(user.plan) &&
      ["active", "trialing"].includes(user.subscriptionStatus),
  );
  if (includeConversionToken && !result.conversionToken) {
    result.conversionToken = randomBytes(24).toString("hex");
    await result.save();
  }

  return buildLinkResponse(result, { includeConversionToken });
};

const updateLinkIntoDB = async (
  id: string,
  userPayload: TAuthUser,
  payload: {
    originalUrl?: string;
    customAlias?: string;
    isActive?: boolean;
    isFavorite?: boolean;
    isArchived?: boolean;
    password?: string;
    removePassword?: boolean;
    startsAt?: string | null;
    expiresAt?: string | null;
    maxClicks?: number | null;
    campaignId?: string | null;
    domainId?: string | null;
    tags?: string[];
    folder?: string | null;
    notes?: string | null;
  },
) => {
  const userId = userPayload.id;
  const link = await Link.findOne({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
  }).select("+passwordHash");

  if (!link) {
    throw new AppError(404, "Link Not Found");
  }
  validateLinkFeatureChanges(payload, link, userPayload);

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
  if (typeof payload.isFavorite === "boolean") {
    link.isFavorite = payload.isFavorite;
  }

  if (typeof payload.isArchived === "boolean") {
    link.isArchived = payload.isArchived;
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

  if (payload.startsAt !== undefined) {
    link.startsAt = payload.startsAt ? new Date(payload.startsAt) : null;
  }

  validateLinkSchedule(link.startsAt, link.expiresAt);

  if (payload.maxClicks !== undefined) {
    link.maxClicks = payload.maxClicks === null ? null : payload.maxClicks;
  }

  if (payload.tags !== undefined) {
    link.tags = normalizeTags(payload.tags);
  }

  if (payload.folder !== undefined) {
    link.folder = payload.folder?.trim() || null;
  }

  if (payload.notes !== undefined) {
    link.notes = payload.notes?.trim() || null;
  }

  if (payload.campaignId !== undefined) {
    if (payload.campaignId === null) {
      link.campaignId = null;
    } else {
      const isChangingCampaign =
        link.campaignId?.toString() !== payload.campaignId;

      if (link.isArchived && isChangingCampaign) {
        throw new AppError(400, "Restore this link before moving it to a campaign");
      }

      if (isChangingCampaign) {
        await validateCampaignOwnership(payload.campaignId, userId);
      }
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

  const populatedResult = await result.populate([
    { path: "domainId" },
    { path: "campaignId", select: "name status startDate endDate" },
  ]);

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

const redirectLinkByHostFromDB = async (
  shortCode: string,
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
  });

  if (!link) {
    throw new AppError(404, "Short link not found");
  }

  validateLinkAvailability(link);
  await validateCampaignAvailability(link.campaignId);

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
  await validateCampaignAvailability(link.campaignId);

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

const checkLinkHealthFromDB = async (link: any) => {
  let statusCode: number | null = null;
  try {
    const response = await fetch(link.originalUrl, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
    });
    statusCode = response.status;
    link.healthStatus = response.ok ? "healthy" : "broken";
  } catch {
    link.healthStatus = "broken";
  }
  link.healthStatusCode = statusCode;
  link.healthCheckedAt = new Date();
  await link.save();
};

const checkAllLinkHealthFromDB = async () => {
  const users = await User.find({
    plan: { $in: ["pro", "lifetime"] },
    subscriptionStatus: { $in: ["active", "trialing"] },
  }).select("_id");
  const links = await Link.find({
    userId: { $in: users.map((user) => user._id) },
    isGuest: false,
    isArchived: { $ne: true },
  });
  for (const link of links) await checkLinkHealthFromDB(link);
  return { checkedLinks: links.length };
};

const checkSingleLinkHealthFromDB = async (id: string, userPayload: TAuthUser) => {
  checkPlanFeature({
    plan: userPayload.plan,
    subscriptionStatus: userPayload.subscriptionStatus,
    feature: "linkMonitoring",
    message: "Upgrade to Pro or Lifetime to monitor destination health.",
  });
  const link = await Link.findOne({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userPayload.id),
  });
  if (!link) throw new AppError(404, "Link not found");
  await checkLinkHealthFromDB(link);
  return buildLinkResponse(link);
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
  createBulkLinksIntoDB,
  getMyLinksFromDB,
  getSingleLinkFromDB,
  updateLinkIntoDB,
  deleteLinkFromDB,
  redirectLinkByHostFromDB,
  unlockPasswordProtectedLinkFromDB,
  generateQrCodeFromDB,
  checkAllLinkHealthFromDB,
  checkSingleLinkHealthFromDB,
};
