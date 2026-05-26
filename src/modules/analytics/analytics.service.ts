import { Types } from "mongoose";
import AppError from "../../errors/AppError.js";
import { Link } from "../link/link.model.js";
import { ClickEvent } from "./analytics.model.js";
import { Campaign } from "../campaign/campaign.model.js";

type TDateFilters = {
  startDate?: string | undefined;
  endDate?: string | undefined;
};

const buildDateMatch = (filters?: TDateFilters) => {
  const dateMatch: Record<string, Date> = {};

  if (filters?.startDate) {
    dateMatch.$gte = new Date(filters.startDate);
  }

  if (filters?.endDate) {
    dateMatch.$lte = new Date(filters.endDate);
  }

  return Object.keys(dateMatch).length > 0 ? { clickedAt: dateMatch } : {};
};

const checkLinkOwnership = async (linkId: string, userId: string) => {
  const link = await Link.findOne({
    _id: new Types.ObjectId(linkId),
    userId: new Types.ObjectId(userId),
  });

  if (!link) {
    throw new AppError(404, "Link not found");
  }

  return link;
};

const checkCampaignOwnership = async (campaignId: string, userId: string) => {
  const campaign = await Campaign.findOne({
    _id: new Types.ObjectId(campaignId),
    userId: new Types.ObjectId(userId),
  });

  if (!campaign) {
    throw new AppError(404, "Campaign not found");
  }

  return campaign;
};

const getAnalyticsOverviewFromDB = async (
  userId: string,
  filters?: TDateFilters,
) => {
  const userObjectId = new Types.ObjectId(userId);
  const dateMatch = buildDateMatch(filters);

  const totalLinks = await Link.countDocuments({
    userId: userObjectId,
  });

  const totalClicks = await ClickEvent.countDocuments({
    userId: userObjectId,
    ...dateMatch,
  });

  const activeLinks = await Link.countDocuments({
    userId: userObjectId,
    isActive: true,
  });

  const inactiveLinks = await Link.countDocuments({
    userId: userObjectId,
    isActive: false,
  });

  const topLinks = await ClickEvent.aggregate([
    {
      $match: {
        userId: userObjectId,
        ...dateMatch,
      },
    },
    {
      $group: {
        _id: "$linkId",
        clicks: { $sum: 1 },
      },
    },
    {
      $sort: {
        clicks: -1,
      },
    },
    {
      $limit: 5,
    },
    {
      $lookup: {
        from: "links",
        localField: "_id",
        foreignField: "_id",
        as: "link",
      },
    },
    {
      $unwind: "$link",
    },
    {
      $project: {
        _id: 0,
        linkId: "$_id",
        originalUrl: "$link.originalUrl",
        shortCode: "$link.shortCode",
        isActive: "$link.isActive",
        clicks: 1,
      },
    },
  ]);

  return {
    totalLinks,
    totalClicks,
    activeLinks,
    inactiveLinks,
    topLinks,
  };
};

const getSingleLinkAnalyticsFromDB = async (
  linkId: string,
  userId: string,
  filters?: TDateFilters,
) => {
  const link = await checkLinkOwnership(linkId, userId);
  const linkObjectId = new Types.ObjectId(linkId);
  const dateMatch = buildDateMatch(filters);

  const totalClicks = await ClickEvent.countDocuments({
    linkId: linkObjectId,
    ...dateMatch,
  });

  const uniqueVisitors = await ClickEvent.distinct("ipAddress", {
    linkId: linkObjectId,
    ipAddress: { $ne: null },
    ...dateMatch,
  });

  const lastClick = await ClickEvent.findOne({
    linkId: linkObjectId,
    ...dateMatch,
  })
    .sort({ clickedAt: -1 })
    .select("clickedAt browser os device referrer");

  return {
    link: {
      id: link._id,
      originalUrl: link.originalUrl,
      shortCode: link.shortCode,
      clicks: link.clicks,
      isActive: link.isActive,
      isPasswordProtected: link.isPasswordProtected,
      expiresAt: link.expiresAt,
      maxClicks: link.maxClicks,
      createdAt: link.createdAt,
    },
    totalClicks,
    uniqueVisitors: uniqueVisitors.length,
    lastClick,
  };
};

const getDailyClicksFromDB = async (
  linkId: string,
  userId: string,
  filters?: TDateFilters,
) => {
  await checkLinkOwnership(linkId, userId);
  const dateMatch = buildDateMatch(filters);

  const result = await ClickEvent.aggregate([
    {
      $match: {
        linkId: new Types.ObjectId(linkId),
        ...dateMatch,
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$clickedAt",
          },
        },
        clicks: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
    {
      $project: {
        _id: 0,
        date: "$_id",
        clicks: 1,
      },
    },
  ]);

  return result;
};

const getDeviceAnalyticsFromDB = async (
  linkId: string,
  userId: string,
  filters?: TDateFilters,
) => {
  await checkLinkOwnership(linkId, userId);
  const dateMatch = buildDateMatch(filters);

  const result = await ClickEvent.aggregate([
    {
      $match: {
        linkId: new Types.ObjectId(linkId),
        ...dateMatch,
      },
    },
    {
      $group: {
        _id: "$device",
        clicks: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        clicks: -1,
      },
    },
    {
      $project: {
        _id: 0,
        device: "$_id",
        clicks: 1,
      },
    },
  ]);

  return result;
};

const getBrowserAnalyticsFromDB = async (
  linkId: string,
  userId: string,
  filters?: TDateFilters,
) => {
  await checkLinkOwnership(linkId, userId);
  const dateMatch = buildDateMatch(filters);

  const result = await ClickEvent.aggregate([
    {
      $match: {
        linkId: new Types.ObjectId(linkId),
        ...dateMatch,
      },
    },
    {
      $group: {
        _id: "$browser",
        clicks: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        clicks: -1,
      },
    },
    {
      $project: {
        _id: 0,
        browser: "$_id",
        clicks: 1,
      },
    },
  ]);

  return result;
};

const getReferrerAnalyticsFromDB = async (
  linkId: string,
  userId: string,
  filters?: TDateFilters,
) => {
  await checkLinkOwnership(linkId, userId);
  const dateMatch = buildDateMatch(filters);

  const result = await ClickEvent.aggregate([
    {
      $match: {
        linkId: new Types.ObjectId(linkId),
        ...dateMatch,
      },
    },
    {
      $group: {
        _id: {
          $ifNull: ["$referrer", "Direct"],
        },
        clicks: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        clicks: -1,
      },
    },
    {
      $project: {
        _id: 0,
        referrer: "$_id",
        clicks: 1,
      },
    },
  ]);

  return result;
};

const getCampaignAnalyticsFromDB = async (
  campaignId: string,
  userId: string,
  filters?: TDateFilters,
) => {
  const campaign = await checkCampaignOwnership(campaignId, userId);

  const campaignObjectId = new Types.ObjectId(campaignId);
  const userObjectId = new Types.ObjectId(userId);
  const dateMatch = buildDateMatch(filters);

  const campaignLinks = await Link.find({
    campaignId: campaignObjectId,
    userId: userObjectId,
  }).select("_id originalUrl shortCode clicks isActive");

  const linkIds = campaignLinks.map((link) => link._id);

  const totalLinks = campaignLinks.length;

  const totalClicks = await ClickEvent.countDocuments({
    userId: userObjectId,
    linkId: { $in: linkIds },
    ...dateMatch,
  });

  const topLinks = await ClickEvent.aggregate([
    {
      $match: {
        userId: userObjectId,
        linkId: { $in: linkIds },
        ...dateMatch,
      },
    },
    {
      $group: {
        _id: "$linkId",
        clicks: { $sum: 1 },
      },
    },
    {
      $sort: {
        clicks: -1,
      },
    },
    {
      $limit: 5,
    },
    {
      $lookup: {
        from: "links",
        localField: "_id",
        foreignField: "_id",
        as: "link",
      },
    },
    {
      $unwind: "$link",
    },
    {
      $project: {
        _id: 0,
        linkId: "$_id",
        originalUrl: "$link.originalUrl",
        shortCode: "$link.shortCode",
        isActive: "$link.isActive",
        clicks: 1,
      },
    },
  ]);

  const uniqueVisitors = await ClickEvent.distinct("ipAddress", {
    userId: userObjectId,
    linkId: { $in: linkIds },
    ipAddress: { $ne: null },
    ...dateMatch,
  });

  const goalClicks = campaign.goalClicks ?? null;
  const goalProgress =
    goalClicks && goalClicks > 0
      ? Math.round((totalClicks / goalClicks) * 100)
      : null;

  return {
    campaign: {
      id: campaign._id,
      name: campaign.name,
      description: campaign.description,
      status: campaign.status,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      goalClicks: campaign.goalClicks,
    },
    totalLinks,
    totalClicks,
    uniqueVisitors: uniqueVisitors.length,
    goalProgress,
    topLinks,
  };
};

const getCampaignDailyClicksFromDB = async (
  campaignId: string,
  userId: string,
  filters?: TDateFilters,
) => {
  await checkCampaignOwnership(campaignId, userId);

  const campaignObjectId = new Types.ObjectId(campaignId);
  const userObjectId = new Types.ObjectId(userId);
  const dateMatch = buildDateMatch(filters);

  const campaignLinks = await Link.find({
    campaignId: campaignObjectId,
    userId: userObjectId,
  }).select("_id");

  const linkIds = campaignLinks.map((link) => link._id);

  const result = await ClickEvent.aggregate([
    {
      $match: {
        userId: userObjectId,
        linkId: { $in: linkIds },
        ...dateMatch,
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$clickedAt",
          },
        },
        clicks: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
    {
      $project: {
        _id: 0,
        date: "$_id",
        clicks: 1,
      },
    },
  ]);

  return result;
};

const getCampaignDeviceAnalyticsFromDB = async (
  campaignId: string,
  userId: string,
  filters?: TDateFilters,
) => {
  await checkCampaignOwnership(campaignId, userId);

  const campaignObjectId = new Types.ObjectId(campaignId);
  const userObjectId = new Types.ObjectId(userId);
  const dateMatch = buildDateMatch(filters);

  const campaignLinks = await Link.find({
    campaignId: campaignObjectId,
    userId: userObjectId,
  }).select("_id");

  const linkIds = campaignLinks.map((link) => link._id);

  const result = await ClickEvent.aggregate([
    {
      $match: {
        userId: userObjectId,
        linkId: { $in: linkIds },
        ...dateMatch,
      },
    },
    {
      $group: {
        _id: "$device",
        clicks: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        clicks: -1,
      },
    },
    {
      $project: {
        _id: 0,
        device: "$_id",
        clicks: 1,
      },
    },
  ]);

  return result;
};

const getCampaignBrowserAnalyticsFromDB = async (
  campaignId: string,
  userId: string,
  filters?: TDateFilters,
) => {
  await checkCampaignOwnership(campaignId, userId);

  const campaignObjectId = new Types.ObjectId(campaignId);
  const userObjectId = new Types.ObjectId(userId);
  const dateMatch = buildDateMatch(filters);

  const campaignLinks = await Link.find({
    campaignId: campaignObjectId,
    userId: userObjectId,
  }).select("_id");

  const linkIds = campaignLinks.map((link) => link._id);

  const result = await ClickEvent.aggregate([
    {
      $match: {
        userId: userObjectId,
        linkId: { $in: linkIds },
        ...dateMatch,
      },
    },
    {
      $group: {
        _id: "$browser",
        clicks: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        clicks: -1,
      },
    },
    {
      $project: {
        _id: 0,
        browser: "$_id",
        clicks: 1,
      },
    },
  ]);

  return result;
};

const getCampaignReferrerAnalyticsFromDB = async (
  campaignId: string,
  userId: string,
  filters?: TDateFilters,
) => {
  await checkCampaignOwnership(campaignId, userId);

  const campaignObjectId = new Types.ObjectId(campaignId);
  const userObjectId = new Types.ObjectId(userId);
  const dateMatch = buildDateMatch(filters);

  const campaignLinks = await Link.find({
    campaignId: campaignObjectId,
    userId: userObjectId,
  }).select("_id");

  const linkIds = campaignLinks.map((link) => link._id);

  const result = await ClickEvent.aggregate([
    {
      $match: {
        userId: userObjectId,
        linkId: { $in: linkIds },
        ...dateMatch,
      },
    },
    {
      $group: {
        _id: {
          $ifNull: ["$referrer", "Direct"],
        },
        clicks: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        clicks: -1,
      },
    },
    {
      $project: {
        _id: 0,
        referrer: "$_id",
        clicks: 1,
      },
    },
  ]);

  return result;
};

export const AnalyticsServices = {
  getAnalyticsOverviewFromDB,
  getSingleLinkAnalyticsFromDB,
  getDailyClicksFromDB,
  getDeviceAnalyticsFromDB,
  getBrowserAnalyticsFromDB,
  getReferrerAnalyticsFromDB,
  getCampaignAnalyticsFromDB,
  getCampaignDailyClicksFromDB,
  getCampaignDeviceAnalyticsFromDB,
  getCampaignBrowserAnalyticsFromDB,
  getCampaignReferrerAnalyticsFromDB,
};
