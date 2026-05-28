import express from "express";
import { CampaignControllers } from "./campaign.controller.js";
import { CampaignValidations } from "./campaign.validation.js";
import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";

const router = express.Router();

router.post(
  "/",
  auth("user", "admin"),
  validateRequest(CampaignValidations.createCampaignValidationSchema),
  CampaignControllers.createCampaign,
);

router.get("/", auth("user", "admin"), CampaignControllers.getMyCampaigns);

router.get(
  "/:id/links",
  auth("user", "admin"),
  validateRequest(CampaignValidations.campaignIdValidationSchema),
  CampaignControllers.getCampaignLinks,
);

router.get(
  "/:id/available-links",
  auth("user", "admin"),
  validateRequest(CampaignValidations.campaignIdValidationSchema),
  CampaignControllers.getAvailableLinksForCampaign,
);

router.patch(
  "/:id/links/:linkId/add",
  auth("user", "admin"),
  validateRequest(CampaignValidations.campaignLinkIdValidationSchema),
  CampaignControllers.addLinkToCampaign,
);

router.patch(
  "/:id/links/:linkId/remove",
  auth("user", "admin"),
  validateRequest(CampaignValidations.campaignLinkIdValidationSchema),
  CampaignControllers.removeLinkFromCampaign,
);

router.get(
  "/:id",
  auth("user", "admin"),
  validateRequest(CampaignValidations.campaignIdValidationSchema),
  CampaignControllers.getSingleCampaign,
);

router.patch(
  "/:id",
  auth("user", "admin"),
  validateRequest(CampaignValidations.updateCampaignValidationSchema),
  CampaignControllers.updateCampaign,
);

router.delete(
  "/:id",
  auth("user", "admin"),
  validateRequest(CampaignValidations.campaignIdValidationSchema),
  CampaignControllers.deleteCampaign,
);

export const CampaignRoutes = router;
