import { Types } from "mongoose";
import AppError from "../../errors/AppError.js";
import { generateShortCode } from "../../utils/generateShortCode.js";
import { Link } from "./link.model.js";
import config from "../../config/index.js";
import bcrypt from "bcrypt";
import QRCode from "qrcode";
import { Campaign } from "../campaign/campaign.model.js";
import { Domain } from "../domain/domain.model.js";

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

const buildLinkResponse = (link: any) => {
  const domainDoc = link.domainId;
  const isDomainUsable =
    domainDoc &&
    typeof domainDoc === "object" &&
    domainDoc.domain &&
    domainDoc.status === "verified" &&
    domainDoc.isActive === true;

  return {
    id: link._id,
    campaignId: link.campaignId ?? null,
    domainId: domainDoc?._id ?? domainDoc ?? null,

    originalUrl: link.originalUrl,
    shortCode: link.shortCode,

    shortUrl: `${config.base_url}/${link.shortCode}`,
    customShortUrl: isDomainUsable
      ? `https://${domainDoc.domain}/${link.shortCode}`
      : null,

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
  userId: string,
) => {
  let shortCode = payload.customAlias || generateShortCode();
  let domainObjectId = null;
  let passwordHash: string | null = null;
  let campaignObjectId = null;

  if (reservedAliases.includes(shortCode.toLowerCase())) {
    throw new AppError(400, "This alias is reserved. Please use another one.");
  }

  if (payload.domainId) {
    await validateDomainOwnership(payload.domainId, userId);
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
    await validateCampaignOwnership(payload.campaignId, userId);
    campaignObjectId = new Types.ObjectId(payload.campaignId);
  }

  const result = await Link.create({
    userId: new Types.ObjectId(userId),
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

const redirectLinkFromDB = async (shortCode: string) => {
  const link = await Link.findOne({ shortCode });

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

  link.clicks += 1;
  await link.save();

  return {
    requiresPassword: false,
    shortCode: link.shortCode,
    originalUrl: link.originalUrl,
    linkId: link._id,
    userId: link.userId,
  };
};

const redirectLinkByHostFromDB = async (shortCode: string, host: string) => {
  const normalizedHost = normalizeHost(host);

  const domain = await Domain.findOne({
    domain: normalizedHost,
    status: "verified",
    isActive: true,
  });

  let link;

  if (domain) {
    link = await Link.findOne({
      shortCode,
      domainId: domain._id,
    });
  } else {
    link = await Link.findOne({
      shortCode,
      domainId: null,
    });
  }

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

  link.clicks += 1;
  await link.save();

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
) => {
  const link = await Link.findOne({ shortCode }).select("+passwordHash");

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
  link.clicks += 1;
  await link.save();

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
  });

  if (!link) {
    throw new AppError(404, "Link not found");
  }

  const shortUrl = `${config.base_url}/${link.shortCode}`;

  const qrCode = await QRCode.toDataURL(shortUrl, {
    type: "image/png",
    margin: 2,
    width: 500,
  });

  return {
    shortUrl,
    qrCode,
  };
};

export const LinkServices = {
  createLinkIntoDB,
  getMyLinksFromDB,
  getSingleLinkFromDB,
  updateLinkIntoDB,
  deleteLinkFromDB,
  redirectLinkFromDB,
  redirectLinkByHostFromDB,
  unlockPasswordProtectedLinkFromDB,
  generateQrCodeFromDB,
};
