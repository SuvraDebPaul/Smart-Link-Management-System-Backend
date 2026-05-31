import { Router } from "express";

import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { BillingControllers } from "./billing.controller.js";
import { BillingValidations } from "./billing.validation.js";

const router = Router();

router.post(
  "/checkout-session",
  auth("user", "admin"),
  validateRequest(BillingValidations.createCheckoutSessionSchema),
  BillingControllers.createCheckoutSession,
);

router.post(
  "/portal-session",
  auth("user", "admin"),
  BillingControllers.createPortalSession,
);

export const BillingRoutes = router;
