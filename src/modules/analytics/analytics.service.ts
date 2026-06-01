import { Types } from "mongoose";
import AppError from "../../errors/AppError.js";
import { Link } from "../link/link.model.js";
import { ClickEvent } from "./analytics.model.js";
import { Campaign } from "../campaign/campaign.model.js";
import { ConversionEvent } from "./conversion.model.js";
import { Page } from "../page/page.model.js";
import { PageVisit } from "../pageVisit/pageVisit.model.js";
import { PageLinkClick } from "../pageVisit/pageLinkClick.model.js";
import { User } from "../user/user.model.js";

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

const buildDateMatchForPageVisits = (filters?: TDateFilters) => {
  const dateMatch: Record<string, Date> = {};

  if (filters?.startDate) {
    dateMatch.$gte = new Date(filters.startDate);
  }

  if (filters?.endDate) {
    dateMatch.$lte = new Date(filters.endDate);
  }

  return Object.keys(dateMatch).length > 0 ? { visitedAt: dateMatch } : {};
};

const buildDateMatchForPageLinkClicks = (filters?: TDateFilters) => {
  const dateMatch: { $gte?: Date; $lte?: Date } = {};

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

const checkPageOwnership = async (pageId: string, userId: string) => {
  const page = await Page.findOne({
    _id: new Types.ObjectId(pageId),
    userId: new Types.ObjectId(userId),
  });

  if (!page) {
    throw new AppError(404, "Page not found");
  }

  return page;
};

const normalizeGroupLabel = (field: string, fallback: string) => ({
  $cond: [
    {
      $or: [{ $eq: [`$${field}`, null] }, { $eq: [`$${field}`, ""] }],
    },
    fallback,
    `$${field}`,
  ],
});
const mergeBreakdownItems = (
  items: { name: string | null; total: number }[],
  fallback: string,
) => {
  const resultMap = new Map<string, number>();

  for (const item of items) {
    const label = item.name || fallback;
    resultMap.set(label, (resultMap.get(label) ?? 0) + item.total);
  }

  return Array.from(resultMap.entries())
    .map(([name, total]) => ({
      name,
      total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
};
const mergeDailyActivity = (
  clicks: { date: string; clicks: number }[],
  visits: { date: string; visits: number }[],
) => {
  const activityMap = new Map<
    string,
    {
      date: string;
      clicks: number;
      visits: number;
    }
  >();

  for (const item of clicks) {
    activityMap.set(item.date, {
      date: item.date,
      clicks: item.clicks,
      visits: 0,
    });
  }

  for (const item of visits) {
    const existing = activityMap.get(item.date);

    activityMap.set(item.date, {
      date: item.date,
      clicks: existing?.clicks ?? 0,
      visits: item.visits,
    });
  }

  return Array.from(activityMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
};

const getAnalyticsOverviewFromDB = async (
  userId: string,
  filters?: TDateFilters,
) => {
  const userObjectId = new Types.ObjectId(userId);

  const clickDateMatch = buildDateMatch(filters);
  const pageVisitDateMatch = buildDateMatchForPageVisits(filters);
  const pageLinkClickDateMatch = buildDateMatchForPageLinkClicks(filters);

  const userPages = await Page.find({
    userId: userObjectId,
  })
    .select("_id")
    .lean();

  const pageIds = userPages.map((page) => page._id);

  const [
    totalLinks,
    totalClicks,
    activeLinks,
    inactiveLinks,
    totalCampaigns,
    totalPages,
    totalPageVisits,
    totalPageLinkClicks,
    linkVisitorIps,
    pageVisitorIps,
    topLinks,
    topCampaigns,
    dailyClicks,
    dailyVisits,
    linkDevices,
    pageDevices,
    linkBrowsers,
    pageBrowsers,
    linkReferrers,
    pageReferrers,
    pageVisitTotals,
    pageLinkClickTotals,
  ] = await Promise.all([
    Link.countDocuments({
      userId: userObjectId,
    }),

    ClickEvent.countDocuments({
      userId: userObjectId,
      ...clickDateMatch,
    }),

    Link.countDocuments({
      userId: userObjectId,
      isActive: true,
    }),

    Link.countDocuments({
      userId: userObjectId,
      isActive: false,
    }),

    Campaign.countDocuments({
      userId: userObjectId,
    }),

    Page.countDocuments({
      userId: userObjectId,
    }),

    PageVisit.countDocuments({
      pageId: { $in: pageIds },
      ...pageVisitDateMatch,
    }),

    PageLinkClick.countDocuments({
      pageId: { $in: pageIds },
      ...pageLinkClickDateMatch,
    }),

    ClickEvent.distinct("ipAddress", {
      userId: userObjectId,
      ipAddress: { $nin: [null, ""] },
      ...clickDateMatch,
    }),

    PageVisit.distinct("ipAddress", {
      pageId: { $in: pageIds },
      ipAddress: { $nin: [null, ""] },
      ...pageVisitDateMatch,
    }),

    ClickEvent.aggregate([
      {
        $match: {
          userId: userObjectId,
          ...clickDateMatch,
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
    ]),

    ClickEvent.aggregate([
      {
        $match: {
          userId: userObjectId,
          ...clickDateMatch,
        },
      },
      {
        $lookup: {
          from: "links",
          localField: "linkId",
          foreignField: "_id",
          as: "link",
        },
      },
      {
        $unwind: "$link",
      },
      {
        $match: {
          "link.userId": userObjectId,
          "link.campaignId": { $ne: null },
        },
      },
      {
        $group: {
          _id: "$link.campaignId",
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
          from: "campaigns",
          localField: "_id",
          foreignField: "_id",
          as: "campaign",
        },
      },
      {
        $unwind: "$campaign",
      },
      {
        $project: {
          _id: 0,
          campaignId: "$_id",
          name: "$campaign.name",
          status: "$campaign.status",
          clicks: 1,
        },
      },
    ]),

    ClickEvent.aggregate([
      {
        $match: {
          userId: userObjectId,
          ...clickDateMatch,
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
    ]),

    PageVisit.aggregate([
      {
        $match: {
          pageId: { $in: pageIds },
          ...pageVisitDateMatch,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$visitedAt",
            },
          },
          visits: {
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
          visits: 1,
        },
      },
    ]),

    ClickEvent.aggregate([
      {
        $match: {
          userId: userObjectId,
          ...clickDateMatch,
        },
      },
      {
        $group: {
          _id: normalizeGroupLabel("device", "Unknown"),
          total: {
            $sum: 1,
          },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          total: 1,
        },
      },
    ]),

    PageVisit.aggregate([
      {
        $match: {
          pageId: { $in: pageIds },
          ...pageVisitDateMatch,
        },
      },
      {
        $group: {
          _id: normalizeGroupLabel("device", "Unknown"),
          total: {
            $sum: 1,
          },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          total: 1,
        },
      },
    ]),

    ClickEvent.aggregate([
      {
        $match: {
          userId: userObjectId,
          ...clickDateMatch,
        },
      },
      {
        $group: {
          _id: normalizeGroupLabel("browser", "Unknown"),
          total: {
            $sum: 1,
          },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          total: 1,
        },
      },
    ]),

    PageVisit.aggregate([
      {
        $match: {
          pageId: { $in: pageIds },
          ...pageVisitDateMatch,
        },
      },
      {
        $group: {
          _id: normalizeGroupLabel("browser", "Unknown"),
          total: {
            $sum: 1,
          },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          total: 1,
        },
      },
    ]),

    ClickEvent.aggregate([
      {
        $match: {
          userId: userObjectId,
          ...clickDateMatch,
        },
      },
      {
        $group: {
          _id: normalizeGroupLabel("referrer", "Direct"),
          total: {
            $sum: 1,
          },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          total: 1,
        },
      },
    ]),

    PageVisit.aggregate([
      {
        $match: {
          pageId: { $in: pageIds },
          ...pageVisitDateMatch,
        },
      },
      {
        $group: {
          _id: normalizeGroupLabel("referrer", "Direct"),
          total: {
            $sum: 1,
          },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          total: 1,
        },
      },
    ]),

    PageVisit.aggregate([
      {
        $match: {
          pageId: { $in: pageIds },
          ...pageVisitDateMatch,
        },
      },
      {
        $group: {
          _id: "$pageId",
          visits: {
            $sum: 1,
          },
        },
      },
    ]),

    PageLinkClick.aggregate([
      {
        $match: {
          pageId: { $in: pageIds },
          ...pageLinkClickDateMatch,
        },
      },
      {
        $group: {
          _id: "$pageId",
          linkClicks: {
            $sum: 1,
          },
        },
      },
    ]),
  ]);

  const uniqueVisitorSet = new Set<string>();

  for (const ip of linkVisitorIps) {
    uniqueVisitorSet.add(String(ip));
  }

  for (const ip of pageVisitorIps) {
    uniqueVisitorSet.add(String(ip));
  }

  const pageActivityMap = new Map<
    string,
    {
      pageId: string;
      visits: number;
      linkClicks: number;
    }
  >();

  for (const item of pageVisitTotals) {
    const pageId = String(item._id);

    pageActivityMap.set(pageId, {
      pageId,
      visits: item.visits,
      linkClicks: 0,
    });
  }

  for (const item of pageLinkClickTotals) {
    const pageId = String(item._id);
    const existing = pageActivityMap.get(pageId);

    pageActivityMap.set(pageId, {
      pageId,
      visits: existing?.visits ?? 0,
      linkClicks: item.linkClicks,
    });
  }

  const topPageActivity = Array.from(pageActivityMap.values())
    .sort((a, b) => b.visits + b.linkClicks - (a.visits + a.linkClicks))
    .slice(0, 5);

  const topPageIds = topPageActivity.map(
    (item) => new Types.ObjectId(item.pageId),
  );

  const topPageDocuments = await Page.find({
    _id: { $in: topPageIds },
    userId: userObjectId,
  })
    .select("_id title slug")
    .lean();

  const topPageDocumentMap = new Map(
    topPageDocuments.map((page) => [String(page._id), page]),
  );

  const topPages = topPageActivity
    .map((item) => {
      const page = topPageDocumentMap.get(item.pageId);

      if (!page) {
        return null;
      }

      return {
        pageId: item.pageId,
        title: page.title,
        slug: page.slug,
        visits: item.visits,
        linkClicks: item.linkClicks,
      };
    })
    .filter(Boolean);

  const dailyActivity = mergeDailyActivity(dailyClicks, dailyVisits);

  const devices = mergeBreakdownItems(
    [...linkDevices, ...pageDevices],
    "Unknown",
  ).map((item) => ({
    device: item.name,
    total: item.total,
  }));

  const browsers = mergeBreakdownItems(
    [...linkBrowsers, ...pageBrowsers],
    "Unknown",
  ).map((item) => ({
    browser: item.name,
    total: item.total,
  }));

  const referrers = mergeBreakdownItems(
    [...linkReferrers, ...pageReferrers],
    "Direct",
  ).map((item) => ({
    referrer: item.name,
    total: item.total,
  }));

  const bioPageCtr =
    totalPageVisits > 0
      ? Math.round((totalPageLinkClicks / totalPageVisits) * 100)
      : 0;

  const conversionRate =
    totalClicks + totalPageVisits > 0
      ? Math.round(
          ((totalClicks + totalPageLinkClicks) /
            (totalClicks + totalPageVisits)) *
            100,
        )
      : 0;

  return {
    totalLinks,
    totalClicks,
    activeLinks,
    inactiveLinks,

    totalCampaigns,
    totalPages,
    totalPageVisits,
    totalPageLinkClicks,
    uniqueVisitors: uniqueVisitorSet.size,

    bioPageCtr,
    conversionRate,

    dailyActivity,

    topLinks,
    topCampaigns,
    topPages,

    devices,
    browsers,
    referrers,
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

const getPageAnalyticsFromDB = async (
  pageId: string,
  userId: string,
  filters?: TDateFilters,
) => {
  const page = await checkPageOwnership(pageId, userId);

  const pageObjectId = new Types.ObjectId(pageId);
  const dateMatch = buildDateMatchForPageVisits(filters);

  const totalVisits = await PageVisit.countDocuments({
    pageId: pageObjectId,
    ...dateMatch,
  });

  const uniqueVisitors = await PageVisit.distinct("ipAddress", {
    pageId: pageObjectId,
    ipAddress: { $ne: null },
    ...dateMatch,
  });

  const lastVisit = await PageVisit.findOne({
    pageId: pageObjectId,
    ...dateMatch,
  })
    .sort({ visitedAt: -1 })
    .select("visitedAt browser os device referrer");

  return {
    page: {
      id: page._id,
      slug: page.slug,
      title: page.title,
      visits: page.visits,
      isPublished: page.isPublished,
      theme: page.theme,
      createdAt: page.createdAt,
    },
    totalVisits,
    uniqueVisitors: uniqueVisitors.length,
    lastVisit,
  };
};

const getPageDailyVisitsFromDB = async (
  pageId: string,
  userId: string,
  filters?: TDateFilters,
) => {
  await checkPageOwnership(pageId, userId);

  const pageObjectId = new Types.ObjectId(pageId);
  const dateMatch = buildDateMatchForPageVisits(filters);

  const result = await PageVisit.aggregate([
    {
      $match: {
        pageId: pageObjectId,
        ...dateMatch,
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$visitedAt",
          },
        },
        visits: {
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
        visits: 1,
      },
    },
  ]);

  return result;
};

const getPageDeviceAnalyticsFromDB = async (
  pageId: string,
  userId: string,
  filters?: TDateFilters,
) => {
  await checkPageOwnership(pageId, userId);

  const pageObjectId = new Types.ObjectId(pageId);
  const dateMatch = buildDateMatchForPageVisits(filters);

  const result = await PageVisit.aggregate([
    {
      $match: {
        pageId: pageObjectId,
        ...dateMatch,
      },
    },
    {
      $group: {
        _id: "$device",
        visits: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        visits: -1,
      },
    },
    {
      $project: {
        _id: 0,
        device: "$_id",
        visits: 1,
      },
    },
  ]);

  return result;
};

const getPageBrowserAnalyticsFromDB = async (
  pageId: string,
  userId: string,
  filters?: TDateFilters,
) => {
  await checkPageOwnership(pageId, userId);

  const pageObjectId = new Types.ObjectId(pageId);
  const dateMatch = buildDateMatchForPageVisits(filters);

  const result = await PageVisit.aggregate([
    {
      $match: {
        pageId: pageObjectId,
        ...dateMatch,
      },
    },
    {
      $group: {
        _id: "$browser",
        visits: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        visits: -1,
      },
    },
    {
      $project: {
        _id: 0,
        browser: "$_id",
        visits: 1,
      },
    },
  ]);

  return result;
};

const getPageReferrerAnalyticsFromDB = async (
  pageId: string,
  userId: string,
  filters?: TDateFilters,
) => {
  await checkPageOwnership(pageId, userId);

  const pageObjectId = new Types.ObjectId(pageId);
  const dateMatch = buildDateMatchForPageVisits(filters);

  const result = await PageVisit.aggregate([
    {
      $match: {
        pageId: pageObjectId,
        ...dateMatch,
      },
    },
    {
      $group: {
        _id: {
          $ifNull: ["$referrer", "Direct"],
        },
        visits: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        visits: -1,
      },
    },
    {
      $project: {
        _id: 0,
        referrer: "$_id",
        visits: 1,
      },
    },
  ]);

  return result;
};

const getPageLinkClicksFromDB = async (
  pageId: string,
  userId: string,
  filters?: TDateFilters,
) => {
  await checkPageOwnership(pageId, userId);

  const pageObjectId = new Types.ObjectId(pageId);
  const dateMatch = buildDateMatchForPageLinkClicks(filters);

  const result = await PageLinkClick.aggregate([
    {
      $match: {
        pageId: pageObjectId,
        ...dateMatch,
      },
    },
    {
      $group: {
        _id: {
          linkIndex: "$linkIndex",
          linkTitle: "$linkTitle",
          linkUrl: "$linkUrl",
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
        linkIndex: "$_id.linkIndex",
        linkTitle: "$_id.linkTitle",
        linkUrl: "$_id.linkUrl",
        clicks: 1,
      },
    },
  ]);

  return result;
};

const getPageLinkDailyClicksFromDB = async (
  pageId: string,
  userId: string,
  filters?: TDateFilters,
) => {
  await checkPageOwnership(pageId, userId);

  const pageObjectId = new Types.ObjectId(pageId);
  const dateMatch = buildDateMatchForPageLinkClicks(filters);

  const result = await PageLinkClick.aggregate([
    {
      $match: {
        pageId: pageObjectId,
        ...dateMatch,
      },
    },
    {
      $group: {
        _id: {
          date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$clickedAt",
            },
          },
          linkIndex: "$linkIndex",
          linkTitle: "$linkTitle",
        },
        clicks: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        "_id.date": 1,
        clicks: -1,
      },
    },
    {
      $project: {
        _id: 0,
        date: "$_id.date",
        linkIndex: "$_id.linkIndex",
        linkTitle: "$_id.linkTitle",
        clicks: 1,
      },
    },
  ]);

  return result;
};

const createConversionEventIntoDB = async (
  token: string,
  payload: { eventName?: string; value?: number },
  idempotencyKey: string,
) => {
    const link = await Link.findOne({ conversionToken: token, userId: { $ne: null } });
    if (!link || !link.userId) throw new AppError(404, "Tracked link not found");
    const user = await User.findById(link.userId).select("plan subscriptionStatus");
    if (
      !user ||
      !["pro", "lifetime"].includes(user.plan) ||
      !["active", "trialing"].includes(user.subscriptionStatus)
    ) {
      throw new AppError(403, "Conversion tracking requires an active Pro or Lifetime plan");
    }
  const result = await ConversionEvent.updateOne(
    {
      linkId: link._id,
      idempotencyKey,
    },
    {
      $setOnInsert: {
        campaignId: link.campaignId ?? null,
        userId: link.userId,
        eventName: payload.eventName ?? "conversion",
        value: payload.value ?? 0,
      },
    },
    { upsert: true },
  );
  const duplicate = result.upsertedCount === 0;

  if (!duplicate && link.campaignId) {
    const totals = await ConversionEvent.aggregate([
      { $match: { campaignId: link.campaignId } },
      { $group: { _id: null, conversions: { $sum: 1 }, revenue: { $sum: "$value" } } },
    ]);
    await Campaign.updateOne(
      { _id: link.campaignId },
      { $set: { conversions: totals[0]?.conversions ?? 0, revenue: totals[0]?.revenue ?? 0 } },
    );
  }
  return { tracked: !duplicate, duplicate };
};

const compareCampaignsFromDB = async (campaignIds: string[], userId: string) => {
  const campaigns = await Campaign.find({
    _id: { $in: campaignIds.map((id) => new Types.ObjectId(id)) },
    userId: new Types.ObjectId(userId),
  });
  return Promise.all(campaigns.map(async (campaign) => {
    const links = await Link.find({ campaignId: campaign._id }).select("clicks");
    const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
    const conversions = campaign.conversions ?? 0;
    return {
      id: campaign._id,
      name: campaign.name,
      totalLinks: links.length,
      totalClicks,
      conversions,
      revenue: campaign.revenue ?? 0,
      budget: campaign.budget ?? 0,
      conversionRate: totalClicks ? Number(((conversions / totalClicks) * 100).toFixed(2)) : 0,
      roi: campaign.budget ? Number(((((campaign.revenue ?? 0) - campaign.budget) / campaign.budget) * 100).toFixed(2)) : null,
    };
  }));
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
  getPageAnalyticsFromDB,
  getPageDailyVisitsFromDB,
  getPageDeviceAnalyticsFromDB,
  getPageBrowserAnalyticsFromDB,
  getPageReferrerAnalyticsFromDB,
  getPageLinkClicksFromDB,
  getPageLinkDailyClicksFromDB,
  createConversionEventIntoDB,
  compareCampaignsFromDB,
};
