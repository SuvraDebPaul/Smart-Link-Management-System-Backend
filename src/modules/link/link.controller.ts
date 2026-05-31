import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../errors/AppError.js";
import { LinkServices } from "./link.service.js";
import sendResponse from "../../utils/sendResponse.js";
import { createClickEvent } from "../../utils/createClickEvent.js";
import config from "../../config/index.js";

const createLink = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const result = await LinkServices.createLinkIntoDB(req.body, req.user);

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

  const { id } = req.params;
  if (!id || typeof id !== "string") {
    throw new AppError(400, "Valid link id is required");
  }

  const result = await LinkServices.getSingleLinkFromDB(id, req.user.id);

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
  const host = req.hostname;
  try {
    const result = await LinkServices.redirectLinkByHostFromDB(
      shortCode as string,
      host,
    );
    console.log(result);
    if (result.requiresPassword) {
      const query = new URLSearchParams({
        shortCode: result.shortCode,
        host,
      });

      res.redirect(`${config.frontend_url}/unlock?${query.toString()}`);
      return;
    }

    void createClickEvent(req, {
      linkId: result.linkId,
      userId: result.userId,
      shortCode: result.shortCode,
    }).catch((error) => {
      console.error("Failed to record link click event", error);
    });
    res.redirect(result.originalUrl as string);
  } catch (error: any) {
    if (error?.statusCode === 410) {
      const query = new URLSearchParams({
        reason: error.message,
        shortCode: shortCode as string,
      });

      res.redirect(`${config.frontend_url}/expired-link?${query.toString()}`);
      return;
    }

    if (error?.statusCode === 404) {
      const query = new URLSearchParams({
        reason: error.message,
        shortCode: shortCode as string,
      });

      res.redirect(`${config.frontend_url}/expired-link?${query.toString()}`);
      return;
    }

    throw error;
  }
});

const unlockPasswordProtectedLink = catchAsync(
  async (req: Request, res: Response) => {
    const { shortCode } = req.params;
    const { password, host } = req.body;

    const result = await LinkServices.unlockPasswordProtectedLinkFromDB(
      shortCode as string,
      password,
      host,
    );

    void createClickEvent(req, {
      linkId: result.linkId,
      userId: result.userId,
      shortCode: result.shortCode,
    }).catch((error) => {
      console.error("Failed to record link click event", error);
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
