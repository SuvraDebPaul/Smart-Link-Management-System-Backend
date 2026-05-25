import { Types } from "mongoose";
import AppError from "../../errors/AppError.js";
import { generateShortCode } from "../../utils/generateShortCode.js";
import { Link } from "./link.model.js";
import config from "../../config/index.js";

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
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
  };
};

const createLinkIntoDB = async (
  payload: {
    originalUrl: string;
    customAlias?: string;
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

  const result = await Link.create({
    userId: new Types.ObjectId(userId),
    originalUrl: payload.originalUrl,
    shortCode,
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
  payload: { originalUrl?: string; customAlias?: string; isActive?: boolean },
) => {
  const link = await Link.findOne({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
  });

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

  if (!link.isActive) {
    throw new AppError(410, "This link is no longer active");
  }

  link.clicks += 1;
  await link.save();

  return link.originalUrl;
};

export const LinkServices = {
  createLinkIntoDB,
  getMyLinksFromDB,
  getSingleLinkFromDB,
  updateLinkIntoDB,
  deleteLinkFromDB,
  redirectLinkFromDB,
};
