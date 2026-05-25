import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { LinkValidations } from "./link.validation.js";
import { LinkControllers } from "./link.controller.js";

const router = Router();

router.post(
  "/",
  auth("user", "admin"),
  validateRequest(LinkValidations.createLinkValidationSchema),
  LinkControllers.createLink,
);

router.get("/", auth("user", "admin"), LinkControllers.getMyLinks);

router.get(
  "/:id",
  auth("user", "admin"),
  validateRequest(LinkValidations.getSingleLinkValidationSchema),
  LinkControllers.getSingleLink,
);

router.patch(
  "/:id",
  auth("user", "admin"),
  validateRequest(LinkValidations.updateLinkValidationSchema),
  LinkControllers.updateLink,
);

router.delete(
  "/:id",
  auth("user", "admin"),
  validateRequest(LinkValidations.deleteLinkValidationSchema),
  LinkControllers.deleteLink,
);

export const LinkRoutes = router;
