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
router.patch(
  "/:notificationId/read",
  auth("user", "admin"),
  NotificationControllers.markAsRead,
);
router.delete(
  "/:notificationId",
  auth("user", "admin"),
  NotificationControllers.deleteNotification,
);

export const NotificationRoutes = router;
