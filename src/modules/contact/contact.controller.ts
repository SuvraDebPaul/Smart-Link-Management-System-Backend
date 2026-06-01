import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { ContactServices } from "./contact.service.js";

const createContactSubmission = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ContactServices.createContactSubmissionIntoDB(req.body);

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Message received. We will get back to you soon.",
      data: result,
    });
  },
);

export const ContactControllers = {
  createContactSubmission,
};
