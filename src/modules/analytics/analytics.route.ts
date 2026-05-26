import express from "express";
import { AnalyticsControllers } from "./analytics.controller.js";
import { AnalyticsValidations } from "./analytics.validation.js";
import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";

const router = express.Router();

router.get(
  "/overview",
  auth("user", "admin"),
  validateRequest(AnalyticsValidations.dateFilterSchema),
  AnalyticsControllers.getOverview,
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
