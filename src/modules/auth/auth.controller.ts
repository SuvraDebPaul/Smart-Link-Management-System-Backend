import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync.js";
import AuthServices from "./auth.service.js";
import sendResponse from "../../utils/sendResponse.js";

const registerUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthServices.registerUserIntoDB(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "User registerd successfully",
    data: result,
  });
});

const loginUser = catchAsync(async (req, res) => {
  const result = await AuthServices.loginUserFromDB(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User loged in successfully",
    data: result,
  });
});

const AuthControllers = {
  registerUser,
  loginUser,
};

export default AuthControllers;
