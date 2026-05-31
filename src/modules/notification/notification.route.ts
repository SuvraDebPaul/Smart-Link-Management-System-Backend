import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { NotificationControllers } from "./notification.controller.js";

const router = Router();

router.get("/", auth("user", "admin"), NotificationControllers.getMyNotifications);
router.patch(
  "/read-all",
  auth("user", "admin"),
  NotificationControllers.markAllAsRead,
);

export const NotificationRoutes = router;
