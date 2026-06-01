import { Types } from "mongoose";
import AppError from "../../errors/AppError.js";
import { Link } from "../link/link.model.js";
import { Campaign } from "./campaign.model.js";
import type { TAuthUser } from "../user/user.interface.js";
import type { ICampaign } from "./campaign.interface.js";
import { checkPlanFeature, checkPlanLimit } from "../../utils/checkPlanLimit.js";
import { buildLinkResponse } from "../link/link.service.js";
import { randomBytes } from "node:crypto";
import { NotificationServices } from "../notification/notification.service.js";

const normalizeTags = (tags?: string[]) =>
  [...new Set((tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean))];

const buildRoiSummary = (campaign: any, totalClicks = 0) => ({
  costPerClick:
    campaign.budget !== null && campaign.budget !== undefined && totalClicks > 0
      ? Number((campaign.budget / totalClicks).toFixed(2))
      : null,
  conversionRate:
    totalClicks > 0
      ? Number((((campaign.conversions ?? 0) / totalClicks) * 100).toFixed(2))
      : 0,
  roi:
    campaign.budget
      ? Number(((((campaign.revenue ?? 0) - campaign.budget) / campaign.budget) * 100).toFixed(2))
      : null,
});

const buildCampaignResponse = (campaign: any) => {
  return {
    id: campaign._id,
    name: campaign.name,
    description: campaign.description ?? null,
    notes: campaign.notes ?? null,
    clientName: campaign.clientName ?? null,
    clientEmail: campaign.clientEmail ?? null,
    clientPhone: campaign.clientPhone ?? null,
    clientCompany: campaign.clientCompany ?? null,
    status: campaign.status,
    isArchived: campaign.isArchived ?? false,
    startDate: campaign.startDate ?? null,
    endDate: campaign.endDate ?? null,
    goalClicks: campaign.goalClicks ?? null,
    tags: campaign.tags ?? [],
    budget: campaign.budget ?? null,
    conversions: campaign.conversions ?? 0,
    revenue: campaign.revenue ?? null,
    primaryUrl: campaign.primaryUrl ?? null,
    isTemplate: campaign.isTemplate ?? false,
    shareEnabled: campaign.shareEnabled ?? false,
    shareToken: campaign.shareEnabled ? campaign.shareToken ?? null : null,
    utmPreset: campaign.utmPreset ?? {},
    reportFrequency: campaign.reportFrequency ?? "none",
    lastReportAt: campaign.lastReportAt ?? null,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
};

const hasValue = (value: unknown): boolean => {
  if (value === null || value === undefined || value === false || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return value > 0;
  if (typeof value === "object") return Object.values(value).some(hasValue);
  return true;
};

const hasCampaignWorkspacePayload = (payload: Record<string, unknown>) =>
  [
    "notes",
    "clientName",
    "clientEmail",
    "clientPhone",
    "clientCompany",
    "tags",
    "budget",
    "conversions",
    "revenue",
    "primaryUrl",
    "isTemplate",
    "utmPreset",
  ].some((key) => hasValue(payload[key]));

const validateCampaignFeatures = (
  payload: Record<string, unknown>,
  userPayload: TAuthUser,
) => {
  if (hasCampaignWorkspacePayload(payload)) {
    checkPlanFeature({
      plan: userPayload.plan,
      subscriptionStatus: userPayload.subscriptionStatus,
      feature: "campaignWorkspace",
      message: "Upgrade to Starter, Pro, or Lifetime to use campaign workspace fields.",
    });
  }

  if (payload.reportFrequency !== undefined && payload.reportFrequency !== "none") {
    checkPlanFeature({
      plan: userPayload.plan,
      subscriptionStatus: userPayload.subscriptionStatus,
      feature: "scheduledCampaignReports",
      message: "Upgrade to Pro or Lifetime to schedule campaign report emails.",
    });
  }
};

const validateCampaignFeatureChanges = (
  payload: Record<string, unknown>,
  campaign: any,
  userPayload: TAuthUser,
) => {
  const workspaceFields = [
    "notes",
    "clientName",
    "clientEmail",
    "clientPhone",
    "clientCompany",
    "tags",
    "budget",
    "conversions",
    "revenue",
    "primaryUrl",
    "isTemplate",
    "utmPreset",
  ];
  const addsWorkspaceValue = workspaceFields.some(
    (key) =>
      hasValue(payload[key]) &&
      JSON.stringify(payload[key]) !== JSON.stringify(campaign[key] ?? null),
  );

  if (addsWorkspaceValue) {
    checkPlanFeature({
      plan: userPayload.plan,
      subscriptionStatus: userPayload.subscriptionStatus,
      feature: "campaignWorkspace",
      message: "Upgrade to Starter, Pro, or Lifetime to use campaign workspace fields.",
    });
  }

  if (
    payload.reportFrequency !== undefined &&
    payload.reportFrequency !== "none" &&
    payload.reportFrequency !== campaign.reportFrequency
  ) {
    checkPlanFeature({
      plan: userPayload.plan,
      subscriptionStatus: userPayload.subscriptionStatus,
      feature: "scheduledCampaignReports",
      message: "Upgrade to Pro or Lifetime to schedule campaign report emails.",
    });
  }
};

const validateCampaignDateRange = (
  startDate?: Date | null,
  endDate?: Date | null,
) => {
  if (startDate && endDate && endDate < startDate) {
    throw new AppError(400, "Campaign end date cannot be before start date");
  }
};

const ensureCampaignBelongsToUser = async (id: string, userId: string) => {
  const campaign = await Campaign.findOne({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
  });

  if (!campaign) {
    throw new AppError(404, "Campaign not found");
  }

  return campaign;
};

const ensureCampaignAcceptsLinks = (campaign: ICampaign) => {
  if (campaign.isArchived) {
    throw new AppError(400, "Restore this campaign before adding links");
  }
};

const createCampaignIntoDB = async (
  payload: {
    name: string;
    description?: string | null;
    notes?: string | null;
    clientName?: string | null;
    clientEmail?: string | null;
    clientPhone?: string | null;
    clientCompany?: string | null;
    status?: "active" | "paused" | "completed";
    startDate?: string | null;
    endDate?: string | null;
    goalClicks?: number | null;
    tags?: string[];
    budget?: number | null;
    conversions?: number;
    revenue?: number | null;
    primaryUrl?: string | null;
    isTemplate?: boolean;
    utmPreset?: Record<string, string | null | undefined>;
    reportFrequency?: "none" | "daily" | "weekly";
  },
  userPayload: TAuthUser,
) => {
  const userObjectId = new Types.ObjectId(userPayload.id);
  const totalCampaigns = await Campaign.countDocuments({
    userId: userObjectId,
  });
  checkPlanLimit({
    plan: userPayload.plan,
    subscriptionStatus: userPayload.subscriptionStatus,
    key: "campaigns",
    currentUsage: totalCampaigns,
  });
  validateCampaignFeatures(payload, userPayload);

  const startDate = payload.startDate ? new Date(payload.startDate) : null;
  const endDate = payload.endDate ? new Date(payload.endDate) : null;

  validateCampaignDateRange(startDate, endDate);

  const result = await Campaign.create({
    userId: userObjectId,
    name: payload.name,
    description: payload.description ?? null,
    notes: payload.notes ?? null,
    clientName: payload.clientName ?? null,
    clientEmail: payload.clientEmail ?? null,
    clientPhone: payload.clientPhone ?? null,
    clientCompany: payload.clientCompany ?? null,
    status: payload.status ?? "active",
    startDate: startDate,
    endDate: endDate,
    goalClicks: payload.goalClicks ?? null,
    tags: normalizeTags(payload.tags),
    budget: payload.budget ?? null,
    conversions: payload.conversions ?? 0,
    revenue: payload.revenue ?? null,
    primaryUrl: payload.primaryUrl ?? null,
    isTemplate: payload.isTemplate ?? false,
    utmPreset: payload.utmPreset ?? {},
    reportFrequency: payload.reportFrequency ?? "none",
  });

  return buildCampaignResponse(result);
};

const getMyCampaignsFromDB = async (userId: string) => {
  const userObjectId = new Types.ObjectId(userId);
  const result = await Campaign.find({
    userId: userObjectId,
  }).sort({
    createdAt: -1,
  });

  const linkTotals = await Link.aggregate<{
    _id: Types.ObjectId;
    totalLinks: number;
    totalClicks: number;
  }>([
    {
      $match: {
        userId: userObjectId,
        campaignId: { $ne: null },
      },
    },
    {
      $group: {
        _id: "$campaignId",
        totalLinks: { $sum: 1 },
        totalClicks: { $sum: "$clicks" },
      },
    },
  ]);
  const totalsByCampaign = new Map(
    linkTotals.map((totals) => [totals._id.toString(), totals]),
  );

  return result.map((campaign) => {
    const totals = totalsByCampaign.get(campaign._id.toString());

    return {
      ...buildCampaignResponse(campaign),
      totalLinks: totals?.totalLinks ?? 0,
      totalClicks: totals?.totalClicks ?? 0,
      ...buildRoiSummary(campaign, totals?.totalClicks ?? 0),
    };
  });
};

const getSingleCampaignFromDB = async (id: string, userId: string) => {
  const campaign = await ensureCampaignBelongsToUser(id, userId);

  const totalLinks = await Link.countDocuments({
    campaignId: campaign._id,
    userId: new Types.ObjectId(userId),
  });

  return {
    ...buildCampaignResponse(campaign),
    totalLinks,
    ...buildRoiSummary(campaign, await Link.aggregate([
      { $match: { campaignId: campaign._id, userId: new Types.ObjectId(userId) } },
      { $group: { _id: null, clicks: { $sum: "$clicks" } } },
    ]).then((rows) => rows[0]?.clicks ?? 0)),
  };
};

const getCampaignLinksFromDB = async (id: string, userId: string) => {
  const campaign = await ensureCampaignBelongsToUser(id, userId);

  const links = await Link.find({
    campaignId: campaign._id,
    userId: new Types.ObjectId(userId),
  })
    .populate("domainId")
    .populate("campaignId", "name status startDate endDate")
    .sort({ createdAt: -1 });

  return links.map((link) => buildLinkResponse(link));
};

const getAvailableLinksForCampaignFromDB = async (
  id: string,
  userId: string,
) => {
  const campaign = await ensureCampaignBelongsToUser(id, userId);
  if (campaign.isArchived) {
    return [];
  }

  const links = await Link.find({
    campaignId: null,
    userId: new Types.ObjectId(userId),
    isArchived: { $ne: true },
  })
    .populate("domainId")
    .sort({ createdAt: -1 });

  return links.map((link) => buildLinkResponse(link));
};

const addLinkToCampaignIntoDB = async (
  id: string,
  linkId: string,
  userId: string,
) => {
  const campaign = await ensureCampaignBelongsToUser(id, userId);
  ensureCampaignAcceptsLinks(campaign);

  const link = await Link.findOne({
    _id: new Types.ObjectId(linkId),
    userId: new Types.ObjectId(userId),
    isArchived: { $ne: true },
  });

  if (!link) {
    throw new AppError(404, "Current link not found");
  }

  const currentCampaignId = link.campaignId?.toString();

  if (currentCampaignId && currentCampaignId !== campaign._id.toString()) {
    throw new AppError(400, "This link already belongs to another campaign");
  }

  link.campaignId = campaign._id;

  const result = await link.save();

  return result;
};

const removeLinkFromCampaignFromDB = async (
  id: string,
  linkId: string,
  userId: string,
) => {
  const campaign = await ensureCampaignBelongsToUser(id, userId);

  const link = await Link.findOne({
    _id: new Types.ObjectId(linkId),
    userId: new Types.ObjectId(userId),
    campaignId: campaign._id,
  });

  if (!link) {
    throw new AppError(404, "Link not found in this campaign");
  }

  link.campaignId = null;

  const result = await link.save();

  return result;
};

const updateCampaignIntoDB = async (
  id: string,
  userPayload: TAuthUser,
  payload: {
    name?: string;
    description?: string | null;
    notes?: string | null;
    clientName?: string | null;
    clientEmail?: string | null;
    clientPhone?: string | null;
    clientCompany?: string | null;
    status?: "active" | "paused" | "completed";
    isArchived?: boolean;
    startDate?: string | null;
    endDate?: string | null;
    goalClicks?: number | null;
    tags?: string[];
    budget?: number | null;
    conversions?: number;
    revenue?: number | null;
    primaryUrl?: string | null;
    isTemplate?: boolean;
    utmPreset?: Record<string, string | null | undefined>;
    reportFrequency?: "none" | "daily" | "weekly";
  },
) => {
  const campaign = await ensureCampaignBelongsToUser(id, userPayload.id);
  validateCampaignFeatureChanges(payload, campaign, userPayload);

  if (payload.name !== undefined) {
    campaign.name = payload.name;
  }

  if (payload.description !== undefined) {
    campaign.description = payload.description;
  }
  if (payload.notes !== undefined) campaign.notes = payload.notes;
  if (payload.clientName !== undefined) campaign.clientName = payload.clientName;
  if (payload.clientEmail !== undefined) campaign.clientEmail = payload.clientEmail;
  if (payload.clientPhone !== undefined) campaign.clientPhone = payload.clientPhone;
  if (payload.clientCompany !== undefined) campaign.clientCompany = payload.clientCompany;

  if (payload.status !== undefined) {
    campaign.status = payload.status;
  }

  if (payload.isArchived !== undefined) {
    campaign.isArchived = payload.isArchived;
  }

  if (payload.startDate !== undefined) {
    campaign.startDate = payload.startDate ? new Date(payload.startDate) : null;
  }

  if (payload.endDate !== undefined) {
    campaign.endDate = payload.endDate ? new Date(payload.endDate) : null;
  }

  if (payload.goalClicks !== undefined) {
    campaign.goalClicks = payload.goalClicks;
  }
  if (payload.tags !== undefined) campaign.tags = normalizeTags(payload.tags);
  if (payload.budget !== undefined) campaign.budget = payload.budget;
  if (payload.conversions !== undefined) campaign.conversions = payload.conversions;
  if (payload.revenue !== undefined) campaign.revenue = payload.revenue;
  if (payload.primaryUrl !== undefined) campaign.primaryUrl = payload.primaryUrl;
  if (payload.isTemplate !== undefined) campaign.isTemplate = payload.isTemplate;
  if (payload.utmPreset !== undefined) campaign.utmPreset = payload.utmPreset;
  if (payload.reportFrequency !== undefined) campaign.reportFrequency = payload.reportFrequency;

  validateCampaignDateRange(campaign.startDate, campaign.endDate);

  const result = await campaign.save();

  return buildCampaignResponse(result);
};

const duplicateCampaignIntoDB = async (
  id: string,
  userPayload: TAuthUser,
) => {
  const campaign = await ensureCampaignBelongsToUser(id, userPayload.id);
  const totalCampaigns = await Campaign.countDocuments({
    userId: new Types.ObjectId(userPayload.id),
  });
  checkPlanLimit({
    plan: userPayload.plan,
    subscriptionStatus: userPayload.subscriptionStatus,
    key: "campaigns",
    currentUsage: totalCampaigns,
  });

  const result = await Campaign.create({
    userId: new Types.ObjectId(userPayload.id),
    name: `${campaign.name} - Copy`,
    description: campaign.description ?? null,
    notes: campaign.notes ?? null,
    clientName: campaign.clientName ?? null,
    clientEmail: campaign.clientEmail ?? null,
    clientPhone: campaign.clientPhone ?? null,
    clientCompany: campaign.clientCompany ?? null,
    status: "paused",
    isArchived: false,
    startDate: campaign.startDate ?? null,
    endDate: campaign.endDate ?? null,
    goalClicks: campaign.goalClicks ?? null,
    tags: campaign.tags ?? [],
    budget: campaign.budget ?? null,
    conversions: campaign.conversions ?? 0,
    revenue: campaign.revenue ?? null,
    primaryUrl: campaign.primaryUrl ?? null,
    isTemplate: false,
    utmPreset: campaign.utmPreset ?? {},
    reportFrequency: campaign.reportFrequency ?? "none",
  });

  return buildCampaignResponse(result);
};

const bulkUpdateCampaignLinksIntoDB = async (
  id: string,
  userId: string,
  payload: { linkIds: string[]; action: "remove" | "activate" | "pause" | "archive" | "restore" },
) => {
  await ensureCampaignBelongsToUser(id, userId);
  const filter = {
    _id: { $in: payload.linkIds.map((linkId) => new Types.ObjectId(linkId)) },
    userId: new Types.ObjectId(userId),
    campaignId: new Types.ObjectId(id),
  };
  const update =
    payload.action === "remove"
      ? { campaignId: null }
      : payload.action === "activate"
        ? { isActive: true }
        : payload.action === "pause"
          ? { isActive: false }
          : payload.action === "archive"
            ? { isArchived: true }
            : { isArchived: false };
  const result = await Link.updateMany(filter, { $set: update });
  return { updatedCount: result.modifiedCount };
};

const updateCampaignSharingIntoDB = async (
  id: string,
  userPayload: TAuthUser,
  enabled: boolean,
) => {
  if (enabled) {
    checkPlanFeature({
      plan: userPayload.plan,
      subscriptionStatus: userPayload.subscriptionStatus,
      feature: "campaignSharing",
      message: "Upgrade to Pro or Lifetime to share client campaign reports.",
    });
  }
  const campaign = await ensureCampaignBelongsToUser(id, userPayload.id);
  campaign.shareEnabled = enabled;
  campaign.shareToken = enabled ? campaign.shareToken ?? randomBytes(24).toString("hex") : null;
  return buildCampaignResponse(await campaign.save());
};

const getSharedCampaignReportFromDB = async (token: string) => {
  const campaign = await Campaign.findOne({ shareToken: token, shareEnabled: true });
  if (!campaign) throw new AppError(404, "Shared campaign report not found");
  const links = await Link.find({ campaignId: campaign._id }).sort({ clicks: -1 });
  const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
  return {
    campaign: { ...buildCampaignResponse(campaign), shareToken: null },
    summary: { totalLinks: links.length, totalClicks, ...buildRoiSummary(campaign, totalClicks) },
    links: links.map((link) => ({
      shortCode: link.shortCode,
      originalUrl: link.originalUrl,
      clicks: link.clicks,
    })),
  };
};

const notifyEndedCampaignsFromDB = async (userId?: string) => {
  const campaigns = await Campaign.find({
    ...(userId ? { userId: new Types.ObjectId(userId) } : {}),
    endDate: { $lt: new Date() },
  }).select("_id userId name endDate");
  await Promise.all(campaigns.map((campaign) =>
    NotificationServices.createNotification({
      userId: campaign.userId,
      type: "campaign-ended",
      title: "Campaign ended",
      message: `${campaign.name} has reached its configured end date.`,
      eventKey: `campaign-ended:${campaign._id.toString()}:${campaign.endDate?.toISOString()}`,
    }),
  ));
};

const deleteCampaignFromDB = async (id: string, userId: string) => {
  const campaign = await Campaign.findOneAndDelete({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
  });

  if (!campaign) {
    throw new AppError(404, "Campaign not found");
  }

  await Link.updateMany(
    {
      campaignId: campaign._id,
      userId: new Types.ObjectId(userId),
    },
    {
      $set: {
        campaignId: null,
      },
    },
  );

  return buildCampaignResponse(campaign);
};

export const CampaignServices = {
  createCampaignIntoDB,
  getMyCampaignsFromDB,
  getSingleCampaignFromDB,
  getCampaignLinksFromDB,
  getAvailableLinksForCampaignFromDB,
  addLinkToCampaignIntoDB,
  removeLinkFromCampaignFromDB,
  updateCampaignIntoDB,
  duplicateCampaignIntoDB,
  bulkUpdateCampaignLinksIntoDB,
  updateCampaignSharingIntoDB,
  getSharedCampaignReportFromDB,
  notifyEndedCampaignsFromDB,
  deleteCampaignFromDB,
};
