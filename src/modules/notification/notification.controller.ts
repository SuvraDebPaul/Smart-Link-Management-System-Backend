import type { Request, Response } from "express";
import AppError from "../../errors/AppError.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { NotificationServices } from "./notification.service.js";

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, "You are not authorized");

  const status =
    typeof req.query.status === "string" ? req.query.status : undefined;
  const result = await NotificationServices.getMyNotifications(req.user.id, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    ...(status ? { status } : {}),
  });

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

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, "You are not authorized");
  const { notificationId } = req.params;
  if (typeof notificationId !== "string") {
    throw new AppError(404, "Notification not found");
  }

  await NotificationServices.markAsRead(req.user.id, notificationId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notification marked as read",
  });
});

const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, "You are not authorized");
  const { notificationId } = req.params;
  if (typeof notificationId !== "string") {
    throw new AppError(404, "Notification not found");
  }

  await NotificationServices.deleteNotification(
    req.user.id,
    notificationId,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notification deleted successfully",
  });
});

export const NotificationControllers = {
  getMyNotifications,
  markAllAsRead,
  markAsRead,
  deleteNotification,
};
