import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../errors/AppError.js";
import { DomainServices } from "./domain.service.js";
import sendResponse from "../../utils/sendResponse.js";

const createDomain = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const result = await DomainServices.createDomainIntoDB(req.body, req.user.id);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Domain connected successfully",
    data: result,
  });
});

const getMyDomains = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const result = await DomainServices.getMyDomainsFromDB(req.user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Domains retrieved successfully",
    data: result,
  });
});

const getSingleDomain = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const { id } = req.params;

  if (!id || typeof id !== "string") {
    throw new AppError(400, "Valid Id is required");
  }

  const result = await DomainServices.getSingleDomainFromDB(id, req.user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Domain retrieved successfully",
    data: result,
  });
});

const updateDomain = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const { id } = req.params;
  if (!id || typeof id !== "string") {
    throw new AppError(400, "Valid pageId is required");
  }

  const result = await DomainServices.updateDomainIntoDB(
    id,
    req.user.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Domain updated successfully",
    data: result,
  });
});

const deleteDomain = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const { id } = req.params;
  if (!id || typeof id !== "string") {
    throw new AppError(400, "Valid pageId is required");
  }
  const result = await DomainServices.deleteDomainFromDB(id, req.user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Domain deleted successfully",
    data: result,
  });
});

const verifyDomainManually = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const { id } = req.params;
  if (!id || typeof id !== "string") {
    throw new AppError(400, "Valid pageId is required");
  }
  const result = await DomainServices.verifyDomainManuallyIntoDB(
    id,
    req.user.id,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Domain verified successfully",
    data: result,
  });
});

export const DomainControllers = {
  createDomain,
  getMyDomains,
  getSingleDomain,
  updateDomain,
  deleteDomain,
  verifyDomainManually,
};
