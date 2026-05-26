import type { Request, Response } from "express";
import AppError from "../../errors/AppError.js";

import { CampaignServices } from "./campaign.service.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";

const createCampaign = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const result = await CampaignServices.createCampaignIntoDB(
    req.body,
    req.user.id,
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Campaign created successfully",
    data: result,
  });
});

const getMyCampaigns = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const result = await CampaignServices.getMyCampaignsFromDB(req.user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Campaigns retrieved successfully",
    data: result,
  });
});

const getSingleCampaign = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const { id } = req.params;

  const result = await CampaignServices.getSingleCampaignFromDB(
    id as string,
    req.user.id,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Campaign retrieved successfully",
    data: result,
  });
});

const updateCampaign = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const { id } = req.params;

  const result = await CampaignServices.updateCampaignIntoDB(
    id as string,
    req.user.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Campaign updated successfully",
    data: result,
  });
});

const deleteCampaign = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const { id } = req.params;

  const result = await CampaignServices.deleteCampaignFromDB(
    id as string,
    req.user.id,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Campaign deleted successfully",
    data: result,
  });
});

export const CampaignControllers = {
  createCampaign,
  getMyCampaigns,
  getSingleCampaign,
  updateCampaign,
  deleteCampaign,
};
