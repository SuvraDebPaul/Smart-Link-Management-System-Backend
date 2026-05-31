import type { Request, Response } from "express";

import AppError from "../../errors/AppError.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { BillingServices } from "./billing.service.js";

const createCheckoutSession = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const result = await BillingServices.createCheckoutSession(
    req.user.id,
    req.body.plan,
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Stripe Checkout session created successfully",
    data: result,
  });
});

const createPortalSession = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const result = await BillingServices.createPortalSession(req.user.id);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Stripe billing portal session created successfully",
    data: result,
  });
});

const handleStripeWebhook = catchAsync(async (req: Request, res: Response) => {
  await BillingServices.handleStripeWebhook(
    req.body as Buffer,
    req.headers["stripe-signature"],
  );

  res.status(200).json({
    received: true,
  });
});

export const BillingControllers = {
  createCheckoutSession,
  createPortalSession,
  handleStripeWebhook,
};
