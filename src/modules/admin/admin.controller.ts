import type { Request, Response } from "express";
import AppError from "../../errors/AppError.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { AdminServices } from "./admin.service.js";

const getSummary = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminServices.getSummary();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Admin summary retrieved successfully",
    data: result,
  });
});

const getUsers = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminServices.getUsers();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Users retrieved successfully",
    data: result,
  });
});

const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, "You are not authorized");

  const result = await AdminServices.updateUserRole(
    req.user.id,
    req.params.userId as string,
    req.body.role,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User role updated successfully",
    data: result,
  });
});

const getLinks = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminServices.getLinks();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Links retrieved successfully",
    data: result,
  });
});

const updateLinkStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminServices.updateLinkStatus(
    req.params.linkId as string,
    req.body.isActive,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Link status updated successfully",
    data: result,
  });
});

const deleteLink = catchAsync(async (req: Request, res: Response) => {
  await AdminServices.deleteLink(req.params.linkId as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Link deleted successfully",
  });
});

const getDomains = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminServices.getDomains();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Domains retrieved successfully",
    data: result,
  });
});

const updateDomainStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminServices.updateDomainStatus(
    req.params.domainId as string,
    req.body.isActive,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Domain status updated successfully",
    data: result,
  });
});

const verifyDomain = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminServices.verifyDomain(
    req.params.domainId as string,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Domain verified successfully",
    data: result,
  });
});

const deleteDomain = catchAsync(async (req: Request, res: Response) => {
  await AdminServices.deleteDomain(req.params.domainId as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Domain deleted successfully",
  });
});

const getApiKeys = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminServices.getApiKeys();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "API keys retrieved successfully",
    data: result,
  });
});

const revokeApiKey = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminServices.revokeApiKey(
    req.params.apiKeyId as string,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "API key revoked successfully",
    data: result,
  });
});

const getAnalytics = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminServices.getAnalytics();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Admin analytics retrieved successfully",
    data: result,
  });
});

export const AdminControllers = {
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
