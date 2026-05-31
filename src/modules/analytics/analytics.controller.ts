import type { Request, Response } from "express";
import AppError from "../../errors/AppError.js";
import { AnalyticsServices } from "./analytics.service.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";

import { PLAN_LIMITS } from "../../constants/planLimits.js";

const getDateFilters = (req: Request) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  const hasPaidAccess =
    req.user.plan === "free" ||
    ["active", "trialing"].includes(req.user.subscriptionStatus);

  const effectivePlan = hasPaidAccess ? req.user.plan : "free";
  const historyDays = PLAN_LIMITS[effectivePlan].analyticsHistoryDays;

  if (historyDays === "unlimited") {
    return { startDate, endDate };
  }

  const earliestAllowedDate = new Date();
  earliestAllowedDate.setUTCDate(
    earliestAllowedDate.getUTCDate() - historyDays,
  );
  earliestAllowedDate.setUTCHours(0, 0, 0, 0);

  if (startDate && new Date(startDate) < earliestAllowedDate) {
    throw new AppError(
      403,
      `Your plan provides access to ${historyDays} days of analytics history.`,
    );
  }

  return {
    startDate: startDate || earliestAllowedDate.toISOString(),
    endDate,
  };
};

const getOverview = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const result = await AnalyticsServices.getAnalyticsOverviewFromDB(
    req.user.id,
    getDateFilters(req),
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
      getDateFilters(req),
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
    getDateFilters(req),
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
    getDateFilters(req),
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
    getDateFilters(req),
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
    getDateFilters(req),
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

const getPageAnalytics = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const { pageId } = req.params;

  if (!pageId || typeof pageId !== "string") {
    throw new AppError(400, "Valid pageId is required");
  }

  const result = await AnalyticsServices.getPageAnalyticsFromDB(
    pageId,
    req.user.id,
    getDateFilters(req),
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Page analytics retrieved successfully",
    data: result,
  });
});

const getPageDailyVisits = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const { pageId } = req.params;

  if (!pageId || typeof pageId !== "string") {
    throw new AppError(400, "Valid pageId is required");
  }

  const result = await AnalyticsServices.getPageDailyVisitsFromDB(
    pageId,
    req.user.id,
    getDateFilters(req),
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Page daily visits retrieved successfully",
    data: result,
  });
});

const getPageDeviceAnalytics = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, "You are not authorized");
    }

    const { pageId } = req.params;

    if (!pageId || typeof pageId !== "string") {
      throw new AppError(400, "Valid pageId is required");
    }

    const result = await AnalyticsServices.getPageDeviceAnalyticsFromDB(
      pageId,
      req.user.id,
      getDateFilters(req),
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Page device analytics retrieved successfully",
      data: result,
    });
  },
);

const getPageBrowserAnalytics = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, "You are not authorized");
    }

    const { pageId } = req.params;

    if (!pageId || typeof pageId !== "string") {
      throw new AppError(400, "Valid pageId is required");
    }

    const result = await AnalyticsServices.getPageBrowserAnalyticsFromDB(
      pageId,
      req.user.id,
      getDateFilters(req),
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Page browser analytics retrieved successfully",
      data: result,
    });
  },
);

const getPageReferrerAnalytics = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, "You are not authorized");
    }

    const { pageId } = req.params;

    if (!pageId || typeof pageId !== "string") {
      throw new AppError(400, "Valid pageId is required");
    }

    const result = await AnalyticsServices.getPageReferrerAnalyticsFromDB(
      pageId,
      req.user.id,
      getDateFilters(req),
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Page referrer analytics retrieved successfully",
      data: result,
    });
  },
);

const getPageLinkClicks = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const { pageId } = req.params;

  if (!pageId || typeof pageId !== "string") {
    throw new AppError(400, "Valid pageId is required");
  }

  const result = await AnalyticsServices.getPageLinkClicksFromDB(
    pageId,
    req.user.id,
    getDateFilters(req),
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Page link clicks retrieved successfully",
    data: result,
  });
});

const getPageLinkDailyClicks = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, "You are not authorized");
    }

    const { pageId } = req.params;

    if (!pageId || typeof pageId !== "string") {
      throw new AppError(400, "Valid pageId is required");
    }

    const result = await AnalyticsServices.getPageLinkDailyClicksFromDB(
      pageId,
      req.user.id,
      getDateFilters(req),
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Page link daily clicks retrieved successfully",
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
  getPageAnalytics,
  getPageDailyVisits,
  getPageDeviceAnalytics,
  getPageBrowserAnalytics,
  getPageReferrerAnalytics,
  getPageLinkClicks,
  getPageLinkDailyClicks,
};
