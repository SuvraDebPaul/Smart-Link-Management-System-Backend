import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync.js";
import { ApiKeyServices } from "./apiKey.service.js";
import sendResponse from "../../utils/sendResponse.js";
import AppError from "../../errors/AppError.js";

const createApiKey = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, "You are not authorized");
  const { name } = req.body;
  const result = await ApiKeyServices.createApiKeyIntoDB(req.user, name);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "API key created successfully",
    data: result,
  });
});

const getMyApiKeys = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }
  const userId = req.user.id;

  const result = await ApiKeyServices.getMyApiKeysFromDB(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "API keys retrieved successfully",
    data: result,
  });
});

const revokeApiKey = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }
  const userId = req.user.id;

  const { id } = req.params;
  if (!id || typeof id !== "string") {
    throw new AppError(400, "Valid API key id is required");
  }
  const result = await ApiKeyServices.revokeApiKeyFromDB(userId, id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "API key revoked successfully",
    data: result,
  });
});

export const ApiKeyControllers = {
  createApiKey,
  getMyApiKeys,
  revokeApiKey,
};
