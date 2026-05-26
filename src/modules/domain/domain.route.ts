import express from "express";
import { DomainControllers } from "./domain.controller.js";
import { DomainValidations } from "./domain.validation.js";
import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";

const router = express.Router();

router.post(
  "/",
  auth("user", "admin"),
  validateRequest(DomainValidations.createDomainValidationSchema),
  DomainControllers.createDomain,
);

router.get("/", auth("user", "admin"), DomainControllers.getMyDomains);

router.get(
  "/:id",
  auth("user", "admin"),
  validateRequest(DomainValidations.domainIdValidationSchema),
  DomainControllers.getSingleDomain,
);

router.patch(
  "/:id",
  auth("user", "admin"),
  validateRequest(DomainValidations.updateDomainValidationSchema),
  DomainControllers.updateDomain,
);

router.delete(
  "/:id",
  auth("user", "admin"),
  validateRequest(DomainValidations.domainIdValidationSchema),
  DomainControllers.deleteDomain,
);

router.post(
  "/:id/verify",
  auth("user", "admin"),
  validateRequest(DomainValidations.domainIdValidationSchema),
  DomainControllers.verifyDomainManually,
);

router.post(
  "/:id/verify-dns",
  auth("user", "admin"),
  validateRequest(DomainValidations.domainIdValidationSchema),
  DomainControllers.verifyDomainDns,
);
export const DomainRoutes = router;
