import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { AuthValidations } from "./auth.validation.js";
import AuthControllers from "./auth.controller.js";
import { authLimiter } from "../../middleware/rateLimit.js";

const router = Router();

router.post(
  "/register",
  authLimiter,
  validateRequest(AuthValidations.registerValidationSchema),
  AuthControllers.registerUser,
);

router.post(
  "/login",
  authLimiter,
  validateRequest(AuthValidations.loginValidationSchema),
  AuthControllers.loginUser,
);

export const AuthRoutes = router;
