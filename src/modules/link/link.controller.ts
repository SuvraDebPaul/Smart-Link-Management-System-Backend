import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../errors/AppError.js";
import { LinkServices } from "./link.service.js";
import sendResponse from "../../utils/sendResponse.js";
import { createClickEvent } from "../../utils/createClickEvent.js";

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

const generateQrCode = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const { id } = req.params;

  const result = await LinkServices.generateQrCodeFromDB(
    id as string,
    req.user.id,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "QR code generated successfully",
    data: result,
  });
});

const redirectLink = catchAsync(async (req: Request, res: Response) => {
  const { shortCode } = req.params;
  const host = req.headers.host || req.hostname;

  const result = await LinkServices.redirectLinkByHostFromDB(
    shortCode as string,
    host,
  );

  if (result.requiresPassword) {
    res.status(200).json({
      success: false,
      message: "Password required",
      requiresPassword: true,
      shortCode: result.shortCode,
    });
    return;
  }

  await createClickEvent(req, {
    linkId: result.linkId,
    userId: result.userId,
    shortCode: result.shortCode,
  });

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

    await createClickEvent(req, {
      linkId: result.linkId,
      userId: result.userId,
      shortCode: result.shortCode,
    });

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
  generateQrCode,
};
