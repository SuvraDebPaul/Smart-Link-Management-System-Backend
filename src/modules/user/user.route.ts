import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { UserControllers } from "./user.controller.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { UserValidations } from "./user.validation.js";

const router = Router();

router.get("/me", auth("user", "admin"), UserControllers.getMe);

router.patch(
  "/me",
  auth("user", "admin"),
  validateRequest(UserValidations.updateMeValidationSchema),
  UserControllers.updateMe,
);

export const UserRoutes = router;
