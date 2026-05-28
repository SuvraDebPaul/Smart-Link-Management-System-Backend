import { Types } from "mongoose";
import AppError from "../../errors/AppError.js";
import { Link } from "../link/link.model.js";
import { Campaign } from "./campaign.model.js";

const buildCampaignResponse = (campaign: any) => {
  return {
    id: campaign._id,
    name: campaign.name,
    description: campaign.description ?? null,
    status: campaign.status,
    startDate: campaign.startDate ?? null,
    endDate: campaign.endDate ?? null,
    goalClicks: campaign.goalClicks ?? null,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
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

const createCampaignIntoDB = async (
  payload: {
    name: string;
    description?: string | null;
    status?: "active" | "paused" | "completed";
    startDate?: string | null;
    endDate?: string | null;
    goalClicks?: number | null;
  },
  userId: string,
) => {
  const result = await Campaign.create({
    userId: new Types.ObjectId(userId),
    name: payload.name,
    description: payload.description ?? null,
    status: payload.status ?? "active",
    startDate: payload.startDate ? new Date(payload.startDate) : null,
    endDate: payload.endDate ? new Date(payload.endDate) : null,
    goalClicks: payload.goalClicks ?? null,
  });

  return buildCampaignResponse(result);
};

const getMyCampaignsFromDB = async (userId: string) => {
  const result = await Campaign.find({
    userId: new Types.ObjectId(userId),
  }).sort({
    createdAt: -1,
  });

  return result.map((campaign) => buildCampaignResponse(campaign));
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
  };
};

const getCampaignLinksFromDB = async (id: string, userId: string) => {
  const campaign = await ensureCampaignBelongsToUser(id, userId);

  const links = await Link.find({
    campaignId: campaign._id,
    userId: new Types.ObjectId(userId),
  })
    .sort({ createdAt: -1 })
    .lean();

  return links;
};

const getAvailableLinksForCampaignFromDB = async (id: string, userId: string) => {
  await ensureCampaignBelongsToUser(id, userId);

  const links = await Link.find({
    userId: new Types.ObjectId(userId),
    campaignId: null,
  })
    .sort({ createdAt: -1 })
    .lean();

  return links;
};

const addLinkToCampaignIntoDB = async (
  id: string,
  linkId: string,
  userId: string,
) => {
  const campaign = await ensureCampaignBelongsToUser(id, userId);

  const link = await Link.findOne({
    _id: new Types.ObjectId(linkId),
    userId: new Types.ObjectId(userId),
  });

  if (!link) {
    throw new AppError(404, "Link not found");
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
  userId: string,
  payload: {
    name?: string;
    description?: string | null;
    status?: "active" | "paused" | "completed";
    startDate?: string | null;
    endDate?: string | null;
    goalClicks?: number | null;
  },
) => {
  const campaign = await ensureCampaignBelongsToUser(id, userId);

  if (payload.name !== undefined) {
    campaign.name = payload.name;
  }

  if (payload.description !== undefined) {
    campaign.description = payload.description;
  }

  if (payload.status !== undefined) {
    campaign.status = payload.status;
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

  const result = await campaign.save();

  return buildCampaignResponse(result);
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
  deleteCampaignFromDB,
};
