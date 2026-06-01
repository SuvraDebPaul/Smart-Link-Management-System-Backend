import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { ApiKeyControllers } from "./apiKey.controller.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { ApiKeyValidations } from "./apiKey.validation.js";

const router = Router();

router.post(
  "/",
  auth("user", "admin"),
  validateRequest(ApiKeyValidations.createApiKeyValidationSchema),
  ApiKeyControllers.createApiKey,
);

router.get("/", auth("user", "admin"), ApiKeyControllers.getMyApiKeys);

router.post(
  "/:id/rotate",
  auth("user", "admin"),
  validateRequest(ApiKeyValidations.apiKeyIdParamsValidationSchema),
  ApiKeyControllers.rotateApiKey,
);

router.delete(
  "/:id",
  auth("user", "admin"),
  validateRequest(ApiKeyValidations.apiKeyIdParamsValidationSchema),
  ApiKeyControllers.revokeApiKey,
);

export const ApiKeyRoutes = router;
