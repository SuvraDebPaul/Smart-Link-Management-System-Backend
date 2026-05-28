import { Router } from "express";
import { PageControllers } from "./page.controller.js";
import { PageValidations } from "./page.validation.js";
import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";

const router = Router();

router.get(
  "/public/:slug",
  validateRequest(PageValidations.publicPageValidationSchema),
  PageControllers.getPublicPage,
);

/* --- Protected Dashboard Routes --- */
router.get(
  "/public/:slug/click/:linkIndex",
  validateRequest(PageValidations.publicPageLinkClickValidationSchema),
  PageControllers.redirectPublicPageLink,
);

router.post(
  "/",
  auth("user", "admin"),
  validateRequest(PageValidations.createPageValidationSchema),
  PageControllers.createPage,
);

router.get("/", auth("user", "admin"), PageControllers.getMyPages);

router.get(
  "/:id",
  auth("user", "admin"),
  validateRequest(PageValidations.pageIdValidationSchema),
  PageControllers.getSinglePage,
);

router.patch(
  "/:id",
  auth("user", "admin"),
  validateRequest(PageValidations.updatePageValidationSchema),
  PageControllers.updatePage,
);

router.delete(
  "/:id",
  auth("user", "admin"),
  validateRequest(PageValidations.pageIdValidationSchema),
  PageControllers.deletePage,
);

export const PageRoutes = router;
