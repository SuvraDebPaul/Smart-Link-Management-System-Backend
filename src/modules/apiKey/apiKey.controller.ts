import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync.js";
import { ApiKeyServices } from "./apiKey.service.js";
import sendResponse from "../../utils/sendResponse.js";

const createApiKey = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new Error("Authenticated user not found");

  const userId = user.id;
  const { name } = req.body;

  const result = await ApiKeyServices.createApiKeyIntoDB(userId, name);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "API key created successfully",
    data: result,
  });
});

const getMyApiKeys = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new Error("Authenticated user not found");
  const userId = user.id;

  const result = await ApiKeyServices.getMyApiKeysFromDB(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "API keys retrieved successfully",
    data: result,
  });
});

const revokeApiKey = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw new Error("Authenticated user not found");
  const userId = user.id;
  const { id } = req.params;

  const result = await ApiKeyServices.revokeApiKeyFromDB(userId, id as string);

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
