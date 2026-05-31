import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { AdminControllers } from "./admin.controller.js";
import { AdminValidations } from "./admin.validation.js";

const router = Router();

router.get("/summary", auth("admin"), AdminControllers.getSummary);
router.get("/users", auth("admin"), AdminControllers.getUsers);
router.patch(
  "/users/:userId/role",
  auth("admin"),
  validateRequest(AdminValidations.updateUserRoleSchema),
  AdminControllers.updateUserRole,
);
router.get("/links", auth("admin"), AdminControllers.getLinks);
router.patch(
  "/links/:linkId/status",
  auth("admin"),
  validateRequest(AdminValidations.updateLinkStatusSchema),
  AdminControllers.updateLinkStatus,
);
router.delete("/links/:linkId", auth("admin"), AdminControllers.deleteLink);
router.get("/domains", auth("admin"), AdminControllers.getDomains);
router.patch(
  "/domains/:domainId/status",
  auth("admin"),
  validateRequest(AdminValidations.updateDomainStatusSchema),
  AdminControllers.updateDomainStatus,
);
router.post(
  "/domains/:domainId/verify",
  auth("admin"),
  AdminControllers.verifyDomain,
);
router.delete(
  "/domains/:domainId",
  auth("admin"),
  AdminControllers.deleteDomain,
);
router.get("/api-keys", auth("admin"), AdminControllers.getApiKeys);
router.delete(
  "/api-keys/:apiKeyId",
  auth("admin"),
  AdminControllers.revokeApiKey,
);
router.get("/analytics", auth("admin"), AdminControllers.getAnalytics);

export const AdminRoutes = router;
