import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { AuthValidations } from "./auth.validation.js";
import AuthControllers from "./auth.controller.js";

const router = Router();

router.post(
  "/register",
  validateRequest(AuthValidations.registerValidationSchema),
  AuthControllers.registerUser,
);

router.post(
  "/login",
  validateRequest(AuthValidations.loginValidationSchema),
  AuthControllers.loginUser,
);

export const AuthRoutes = router;
