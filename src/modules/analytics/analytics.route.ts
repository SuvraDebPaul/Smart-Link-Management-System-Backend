import express from "express";
import { AnalyticsControllers } from "./analytics.controller.js";
import { AnalyticsValidations } from "./analytics.validation.js";
import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { conversionTrackingLimiter } from "../../middleware/rateLimit.js";

const router = express.Router();

router.post(
  "/conversions/:token",
  conversionTrackingLimiter,
  validateRequest(AnalyticsValidations.conversionValidationSchema),
  AnalyticsControllers.trackConversion,
);
router.get(
  "/campaigns-compare",
  auth("user", "admin"),
  validateRequest(AnalyticsValidations.compareCampaignsValidationSchema),
  AnalyticsControllers.compareCampaigns,
);

router.get(
  "/overview",
  auth("user", "admin"),
  validateRequest(AnalyticsValidations.dateFilterSchema),
  AnalyticsControllers.getOverview,
);

router.get(
  "/pages/:pageId",
  auth("user", "admin"),
  validateRequest(AnalyticsValidations.pageIdValidationSchema),
  AnalyticsControllers.getPageAnalytics,
);

router.get(
  "/pages/:pageId/daily-visits",
  auth("user", "admin"),
  validateRequest(AnalyticsValidations.pageIdValidationSchema),
  AnalyticsControllers.getPageDailyVisits,
);

router.get(
  "/pages/:pageId/devices",
  auth("user", "admin"),
  validateRequest(AnalyticsValidations.pageIdValidationSchema),
  AnalyticsControllers.getPageDeviceAnalytics,
);

router.get(
  "/pages/:pageId/browsers",
  auth("user", "admin"),
  validateRequest(AnalyticsValidations.pageIdValidationSchema),
  AnalyticsControllers.getPageBrowserAnalytics,
);

router.get(
  "/pages/:pageId/referrers",
  auth("user", "admin"),
  validateRequest(AnalyticsValidations.pageIdValidationSchema),
  AnalyticsControllers.getPageReferrerAnalytics,
);

router.get(
  "/campaigns/:campaignId",
  auth("user", "admin"),
  validateRequest(AnalyticsValidations.campaignIdValidationSchema),
  AnalyticsControllers.getCampaignAnalytics,
);

router.get(
  "/campaigns/:campaignId/daily-clicks",
  auth("user", "admin"),
  validateRequest(AnalyticsValidations.campaignIdValidationSchema),
  AnalyticsControllers.getCampaignDailyClicks,
);

router.get(
  "/campaigns/:campaignId/devices",
  auth("user", "admin"),
  validateRequest(AnalyticsValidations.campaignIdValidationSchema),
  AnalyticsControllers.getCampaignDeviceAnalytics,
);

router.get(
  "/campaigns/:campaignId/browsers",
  auth("user", "admin"),
  validateRequest(AnalyticsValidations.campaignIdValidationSchema),
  AnalyticsControllers.getCampaignBrowserAnalytics,
);

router.get(
  "/campaigns/:campaignId/referrers",
  auth("user", "admin"),
  validateRequest(AnalyticsValidations.campaignIdValidationSchema),
  AnalyticsControllers.getCampaignReferrerAnalytics,
);

router.get(
  "/links/:linkId",
  auth("user", "admin"),
  validateRequest(AnalyticsValidations.linkIdValidationSchema),
  AnalyticsControllers.getSingleLinkAnalytics,
);

router.get(
  "/links/:linkId/daily-clicks",
  auth("user", "admin"),
  validateRequest(AnalyticsValidations.linkIdValidationSchema),
  AnalyticsControllers.getDailyClicks,
);

router.get(
  "/pages/:pageId/link-clicks",
  auth("user", "admin"),
  validateRequest(AnalyticsValidations.pageIdValidationSchema),
  AnalyticsControllers.getPageLinkClicks,
);

router.get(
  "/pages/:pageId/link-clicks/daily",
  auth("user", "admin"),
  validateRequest(AnalyticsValidations.pageIdValidationSchema),
  AnalyticsControllers.getPageLinkDailyClicks,
);

router.get(
  "/links/:linkId/devices",
  auth("user", "admin"),
  validateRequest(AnalyticsValidations.linkIdValidationSchema),
  AnalyticsControllers.getDeviceAnalytics,
);

router.get(
  "/links/:linkId/browsers",
  auth("user", "admin"),
  validateRequest(AnalyticsValidations.linkIdValidationSchema),
  AnalyticsControllers.getBrowserAnalytics,
);

router.get(
  "/links/:linkId/referrers",
  auth("user", "admin"),
  validateRequest(AnalyticsValidations.linkIdValidationSchema),
  AnalyticsControllers.getReferrerAnalytics,
);

export const AnalyticsRoutes = router;
