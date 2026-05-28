import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { ApiKeyControllers } from "./apiKey.controller.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { ApiKeyValidations } from "./apiKey.validation.js";
import {
  apiKeyBasedLimiter,
  linkCreateLimiter,
} from "../../middleware/rateLimit.js";
import flexibleAuth from "../../middleware/flexibleAuth.js";

const router = Router();

router.post(
  "/",
  auth("user", "admin"),
  validateRequest(ApiKeyValidations.createApiKeyValidationSchema),
  ApiKeyControllers.createApiKey,
);

router.get("/", auth("user", "admin"), ApiKeyControllers.getMyApiKeys);

router.delete("/:id", auth("user", "admin"), ApiKeyControllers.revokeApiKey);

export const ApiKeyRoutes = router;
