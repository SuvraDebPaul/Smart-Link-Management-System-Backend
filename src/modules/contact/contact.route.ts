import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { contactSubmissionLimiter } from "../../middleware/rateLimit.js";
import { ContactControllers } from "./contact.controller.js";
import { ContactValidations } from "./contact.validation.js";

const router = Router();

router.post(
  "/",
  contactSubmissionLimiter,
  validateRequest(ContactValidations.createContactSubmissionValidationSchema),
  ContactControllers.createContactSubmission,
);

export const ContactRoutes = router;
