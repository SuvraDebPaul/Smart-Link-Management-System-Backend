import { Types } from "mongoose";
import AppError from "../../errors/AppError.js";
import { ApiKey } from "../apiKey/apiKey.model.js";
import { ClickEvent } from "../analytics/analytics.model.js";
import { Campaign } from "../campaign/campaign.model.js";
import { Domain } from "../domain/domain.model.js";
import { Link } from "../link/link.model.js";
import { buildLinkResponse } from "../link/link.service.js";
import { Page } from "../page/page.model.js";
import { User } from "../user/user.model.js";
import type { TUserRole } from "../user/user.interface.js";

const toObjectId = (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(400, "Invalid id");
  }

  return new Types.ObjectId(id);
};

const buildAdminLinkResponse = (link: any) => ({
  ...buildLinkResponse(link),
  owner: link.userId ?? null,
});

const buildAdminDomainResponse = (domain: any) => ({
  id: domain._id,
  domain: domain.domain,
  status: domain.status,
  isActive: domain.isActive,
  owner: domain.userId ?? null,
  createdAt: domain.createdAt,
  updatedAt: domain.updatedAt,
});

const buildAdminApiKeyResponse = (apiKey: any) => ({
  id: apiKey._id,
  name: apiKey.name,
  keyPrefix: apiKey.keyPrefix,
  owner: apiKey.user ?? null,
  lastUsedAt: apiKey.lastUsedAt ?? null,
  expiresAt: apiKey.expiresAt ?? null,
  isActive: apiKey.isActive,
  createdAt: apiKey.createdAt,
  updatedAt: apiKey.updatedAt,
});

const getSummary = async () => {
  const [users, links, campaigns, pages, domains, apiKeys, paidUsers] =
    await Promise.all([
      User.countDocuments(),
      Link.countDocuments(),
      Campaign.countDocuments(),
      Page.countDocuments(),
      Domain.countDocuments(),
      ApiKey.countDocuments({ isActive: true }),
      User.countDocuments({ plan: { $in: ["starter", "pro"] } }),
    ]);

  return { users, links, campaigns, pages, domains, apiKeys, paidUsers };
};

const getUsers = async () => {
  return User.find()
    .select("name email role plan subscriptionStatus isVerified createdAt")
    .sort({ createdAt: -1 });
};

const updateUserRole = async (
  adminUserId: string,
  userId: string,
  role: TUserRole,
) => {
  if (adminUserId === userId && role !== "admin") {
    throw new AppError(400, "You cannot remove your own admin role");
  }

  const user = await User.findByIdAndUpdate(
    toObjectId(userId),
    { role },
    { new: true },
  ).select("name email role plan subscriptionStatus isVerified createdAt");

  if (!user) {
    throw new AppError(404, "User not found");
  }

  return user;
};

const getLinks = async () => {
  const links = await Link.find()
    .populate("domainId")
    .populate("userId", "name email")
    .sort({ createdAt: -1 });

  return links.map(buildAdminLinkResponse);
};

const updateLinkStatus = async (linkId: string, isActive: boolean) => {
  const link = await Link.findByIdAndUpdate(
    toObjectId(linkId),
    { isActive },
    { new: true },
  )
    .populate("domainId")
    .populate("userId", "name email");

  if (!link) {
    throw new AppError(404, "Link not found");
  }

  return buildAdminLinkResponse(link);
};

const deleteLink = async (linkId: string) => {
  const link = await Link.findByIdAndDelete(toObjectId(linkId));

  if (!link) {
    throw new AppError(404, "Link not found");
  }

  await ClickEvent.deleteMany({ linkId: link._id });
};

const getDomains = async () => {
  const domains = await Domain.find()
    .populate("userId", "name email")
    .sort({ createdAt: -1 });

  return domains.map(buildAdminDomainResponse);
};

const updateDomainStatus = async (domainId: string, isActive: boolean) => {
  const domain = await Domain.findById(toObjectId(domainId));

  if (!domain) {
    throw new AppError(404, "Domain not found");
  }

  if (isActive && domain.status !== "verified") {
    throw new AppError(400, "Verify the domain before activating it");
  }

  domain.isActive = isActive;
  await domain.save();
  await domain.populate("userId", "name email");

  return buildAdminDomainResponse(domain);
};

const verifyDomain = async (domainId: string) => {
  const domain = await Domain.findById(toObjectId(domainId));

  if (!domain) {
    throw new AppError(404, "Domain not found");
  }

  domain.status = "verified";
  await domain.save();
  await domain.populate("userId", "name email");

  return buildAdminDomainResponse(domain);
};

const deleteDomain = async (domainId: string) => {
  const domain = await Domain.findByIdAndDelete(toObjectId(domainId));

  if (!domain) {
    throw new AppError(404, "Domain not found");
  }

  await Link.updateMany({ domainId: domain._id }, { $set: { domainId: null } });
};

const getApiKeys = async () => {
  const apiKeys = await ApiKey.find()
    .select("name keyPrefix user lastUsedAt expiresAt isActive createdAt updatedAt")
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  return apiKeys.map(buildAdminApiKeyResponse);
};

const revokeApiKey = async (apiKeyId: string) => {
  const apiKey = await ApiKey.findOneAndUpdate(
    {
      _id: toObjectId(apiKeyId),
      isActive: true,
    },
    { isActive: false },
    { new: true },
  )
    .select("name keyPrefix user lastUsedAt expiresAt isActive createdAt updatedAt")
    .populate("user", "name email");

  if (!apiKey) {
    throw new AppError(404, "API key not found or already revoked");
  }

  return buildAdminApiKeyResponse(apiKey);
};

const getAnalytics = async () => {
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);
  startDate.setUTCDate(startDate.getUTCDate() - 13);

  const [
    totalClicks,
    uniqueVisitors,
    activeLinks,
    verifiedDomains,
    dailyClickResults,
    topLinks,
    planBreakdown,
    deviceBreakdown,
  ] = await Promise.all([
    ClickEvent.countDocuments(),
    ClickEvent.distinct("ipAddress", { ipAddress: { $nin: [null, ""] } }),
    Link.countDocuments({ isActive: true }),
    Domain.countDocuments({ status: "verified" }),
    ClickEvent.aggregate([
      { $match: { clickedAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: {
              date: "$clickedAt",
              format: "%Y-%m-%d",
              timezone: "UTC",
            },
          },
          clicks: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    ClickEvent.aggregate([
      { $group: { _id: "$linkId", clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "links",
          localField: "_id",
          foreignField: "_id",
          as: "link",
        },
      },
      { $unwind: "$link" },
      {
        $lookup: {
          from: "users",
          localField: "link.userId",
          foreignField: "_id",
          as: "owner",
        },
      },
      { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          id: "$link._id",
          shortCode: "$link.shortCode",
          originalUrl: "$link.originalUrl",
          clicks: 1,
          owner: {
            _id: "$owner._id",
            name: "$owner.name",
            email: "$owner.email",
          },
        },
      },
    ]),
    User.aggregate([
      { $group: { _id: "$plan", total: { $sum: 1 } } },
      { $project: { _id: 0, label: { $ifNull: ["$_id", "free"] }, total: 1 } },
      { $sort: { total: -1 } },
    ]),
    ClickEvent.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$device", "Unknown"] },
          total: { $sum: 1 },
        },
      },
      { $project: { _id: 0, label: "$_id", total: 1 } },
      { $sort: { total: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const clicksByDate = new Map(
    dailyClickResults.map((item) => [item._id, item.clicks]),
  );
  const dailyClicks = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + index);
    const dateLabel = date.toISOString().slice(0, 10);

    return {
      date: dateLabel,
      clicks: clicksByDate.get(dateLabel) ?? 0,
    };
  });

  return {
    totalClicks,
    uniqueVisitors: uniqueVisitors.length,
    activeLinks,
    verifiedDomains,
    dailyClicks,
    topLinks,
    planBreakdown,
    deviceBreakdown,
  };
};

export const AdminServices = {
  getSummary,
  getUsers,
  updateUserRole,
  getLinks,
  updateLinkStatus,
  deleteLink,
  getDomains,
  updateDomainStatus,
  verifyDomain,
  deleteDomain,
  getApiKeys,
  revokeApiKey,
  getAnalytics,
};
