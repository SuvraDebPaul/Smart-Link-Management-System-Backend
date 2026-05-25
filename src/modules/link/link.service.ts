import { Types } from "mongoose";
import AppError from "../../errors/AppError.js";
import { generateShortCode } from "../../utils/generateShortCode.js";
import { Link } from "./link.model.js";
import config from "../../config/index.js";
import bcrypt from "bcrypt";

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

const buildLinkResponse = (link: any) => {
  return {
    id: link._id,
    originalUrl: link.originalUrl,
    shortCode: link.shortCode,
    shortUrl: `${config.base_url}/${link.shortCode}`,
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
  },
  userId: string,
) => {
  let shortCode = payload.customAlias || generateShortCode();

  if (reservedAliases.includes(shortCode.toLowerCase())) {
    throw new AppError(400, "This alias is reserved. Please use another one.");
  }

  const existingShortCode = await Link.findOne({ shortCode });

  if (existingShortCode) {
    throw new AppError(409, "This short code or alias is already taken");
  }
  let passwordHash: string | null = null;

  if (payload.password) {
    passwordHash = await bcrypt.hash(payload.password, 12);
  }

  const result = await Link.create({
    userId: new Types.ObjectId(userId),
    originalUrl: payload.originalUrl,
    shortCode,
    isPasswordProtected: Boolean(payload.password),
    passwordHash,
    expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
    maxClicks: payload.maxClicks ?? null,
  });

  return buildLinkResponse(result);
};

const getMyLinksFromDB = async (userId: string) => {
  const result = await Link.find({
    userId: new Types.ObjectId(userId),
  }).sort({
    createdAt: -1,
  });

  return result.map((link) => buildLinkResponse(link));
};

const getSingleLinkFromDB = async (id: string, userId: string) => {
  const result = await Link.findOne({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
  });

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
    expiresAt?: string;
    maxClicks?: number;
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
    const existingShortCode = await Link.findOne({
      shortCode: newShortCode,
      _id: { $ne: new Types.ObjectId(id) },
    });
    if (existingShortCode) {
      throw new AppError(409, "This short code or alias is already taken");
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
  const result = await link.save();

  return buildLinkResponse(result);
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
    };
  }

  link.clicks += 1;
  await link.save();

  return {
    requiresPassword: false,
    shortCode: link.shortCode,
    originalUrl: link.originalUrl,
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
  };
};

export const LinkServices = {
  createLinkIntoDB,
  getMyLinksFromDB,
  getSingleLinkFromDB,
  updateLinkIntoDB,
  deleteLinkFromDB,
  redirectLinkFromDB,
  unlockPasswordProtectedLinkFromDB,
};
