import type { Request, Response } from "express";
import AppError from "../../errors/AppError.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { NotificationServices } from "./notification.service.js";

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, "You are not authorized");

  const result = await NotificationServices.getMyNotifications(req.user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notifications retrieved successfully",
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, "You are not authorized");

  await NotificationServices.markAllAsRead(req.user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notifications marked as read",
  });
});

export const NotificationControllers = {
  getMyNotifications,
  markAllAsRead,
};
