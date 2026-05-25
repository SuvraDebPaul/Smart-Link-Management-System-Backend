import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../errors/AppError.js";
import { LinkServices } from "./link.service.js";
import sendResponse from "../../utils/sendResponse.js";

const createLink = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const result = await LinkServices.createLinkIntoDB(req.body, req.user.id);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Short link created successfully",
    data: result,
  });
});

const getMyLinks = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const result = await LinkServices.getMyLinksFromDB(req.user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Links retrieved successfully",
    data: result,
  });
});

const getSingleLink = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const { id } = await req.params;

  const result = await LinkServices.getSingleLinkFromDB(
    id as string,
    req.user.id,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Link retrieved successfully",
    data: result,
  });
});

const updateLink = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const { id } = req.params;

  const result = await LinkServices.updateLinkIntoDB(
    id as string,
    req.user.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Link updated successfully",
    data: result,
  });
});

const deleteLink = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const { id } = req.params;

  const result = await LinkServices.deleteLinkFromDB(id as string, req.user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Link deleted successfully",
    data: result,
  });
});

const redirectLink = catchAsync(async (req: Request, res: Response) => {
  const { shortCode } = req.params;
  const result = await LinkServices.redirectLinkFromDB(shortCode as string);

  if (result.requiresPassword) {
    res.status(200).json({
      success: false,
      message: "Password required",
      requiresPassword: true,
      shortCode: result.shortCode,
    });
    return;
  }

  res.redirect(result.originalUrl as string);
});

const unlockPasswordProtectedLink = catchAsync(
  async (req: Request, res: Response) => {
    const { shortCode } = req.params;
    const { password } = req.body;

    const result = await LinkServices.unlockPasswordProtectedLinkFromDB(
      shortCode as string,
      password,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Link unlocked successfully",
      data: {
        originalUrl: result.originalUrl,
        shortCode: result.shortCode,
      },
    });
  },
);

export const LinkControllers = {
  createLink,
  getMyLinks,
  getSingleLink,
  updateLink,
  deleteLink,
  redirectLink,
  unlockPasswordProtectedLink,
};
