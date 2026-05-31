import type { Request, Response } from "express";
import AppError from "../../errors/AppError.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { UserServices } from "./user.service.js";

const getMe = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const result = await UserServices.getMeFromDB(req.user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User profile retrieved successfully",
    data: result,
  });
});

const updateMe = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const result = await UserServices.updateMeIntoDB(req.user.id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

export const UserControllers = {
  getMe,
  updateMe,
};
