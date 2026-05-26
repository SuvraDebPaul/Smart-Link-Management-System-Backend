import type { Request, Response } from "express";
import AppError from "../../errors/AppError.js";
import { AnalyticsServices } from "./analytics.service.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";

const getDateFilters = (req: Request) => {
  return {
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
  };
};

const getOverview = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const result = await AnalyticsServices.getAnalyticsOverviewFromDB(
    req.user.id,
    req.query,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Analytics overview retrieved successfully",
    data: result,
  });
});

const getSingleLinkAnalytics = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, "You are not authorized");
    }

    const { linkId } = req.params;

    if (!linkId || typeof linkId !== "string") {
      throw new AppError(400, "Valid linkId is required");
    }

    const result = await AnalyticsServices.getSingleLinkAnalyticsFromDB(
      linkId,
      req.user.id,
      req.query,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Link analytics retrieved successfully",
      data: result,
    });
  },
);

const getDailyClicks = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const { linkId } = req.params;

  if (!linkId || typeof linkId !== "string") {
    throw new AppError(400, "Valid linkId is required");
  }

  const result = await AnalyticsServices.getDailyClicksFromDB(
    linkId,
    req.user.id,
    req.query,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Daily clicks retrieved successfully",
    data: result,
  });
});

const getDeviceAnalytics = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const { linkId } = req.params;

  if (!linkId || typeof linkId !== "string") {
    throw new AppError(400, "Valid linkId is required");
  }

  const result = await AnalyticsServices.getDeviceAnalyticsFromDB(
    linkId,
    req.user.id,
    req.query,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Device analytics retrieved successfully",
    data: result,
  });
});

const getBrowserAnalytics = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const { linkId } = req.params;

  if (!linkId || typeof linkId !== "string") {
    throw new AppError(400, "Valid linkId is required");
  }

  const result = await AnalyticsServices.getBrowserAnalyticsFromDB(
    linkId,
    req.user.id,
    req.query,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Browser analytics retrieved successfully",
    data: result,
  });
});

const getReferrerAnalytics = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const { linkId } = req.params;

  if (!linkId || typeof linkId !== "string") {
    throw new AppError(400, "Valid linkId is required");
  }

  const result = await AnalyticsServices.getReferrerAnalyticsFromDB(
    linkId,
    req.user.id,
    req.query,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Referrer analytics retrieved successfully",
    data: result,
  });
});

const getCampaignAnalytics = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const { campaignId } = req.params;

  if (!campaignId || typeof campaignId !== "string") {
    throw new AppError(400, "Valid campaignId is required");
  }

  const result = await AnalyticsServices.getCampaignAnalyticsFromDB(
    campaignId,
    req.user.id,
    getDateFilters(req),
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Campaign analytics retrieved successfully",
    data: result,
  });
});

const getCampaignDailyClicks = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, "You are not authorized");
    }

    const { campaignId } = req.params;

    if (!campaignId || typeof campaignId !== "string") {
      throw new AppError(400, "Valid campaignId is required");
    }

    const result = await AnalyticsServices.getCampaignDailyClicksFromDB(
      campaignId,
      req.user.id,
      getDateFilters(req),
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Campaign daily clicks retrieved successfully",
      data: result,
    });
  },
);

const getCampaignDeviceAnalytics = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, "You are not authorized");
    }

    const { campaignId } = req.params;

    if (!campaignId || typeof campaignId !== "string") {
      throw new AppError(400, "Valid campaignId is required");
    }

    const result = await AnalyticsServices.getCampaignDeviceAnalyticsFromDB(
      campaignId,
      req.user.id,
      getDateFilters(req),
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Campaign device analytics retrieved successfully",
      data: result,
    });
  },
);

const getCampaignBrowserAnalytics = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, "You are not authorized");
    }

    const { campaignId } = req.params;

    if (!campaignId || typeof campaignId !== "string") {
      throw new AppError(400, "Valid campaignId is required");
    }

    const result = await AnalyticsServices.getCampaignBrowserAnalyticsFromDB(
      campaignId,
      req.user.id,
      getDateFilters(req),
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Campaign browser analytics retrieved successfully",
      data: result,
    });
  },
);

const getCampaignReferrerAnalytics = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, "You are not authorized");
    }

    const { campaignId } = req.params;

    if (!campaignId || typeof campaignId !== "string") {
      throw new AppError(400, "Valid campaignId is required");
    }

    const result = await AnalyticsServices.getCampaignReferrerAnalyticsFromDB(
      campaignId,
      req.user.id,
      getDateFilters(req),
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Campaign referrer analytics retrieved successfully",
      data: result,
    });
  },
);

export const AnalyticsControllers = {
  getOverview,
  getSingleLinkAnalytics,
  getDailyClicks,
  getDeviceAnalytics,
  getBrowserAnalytics,
  getReferrerAnalytics,
  getCampaignAnalytics,
  getCampaignDailyClicks,
  getCampaignDeviceAnalytics,
  getCampaignBrowserAnalytics,
  getCampaignReferrerAnalytics,
};
