import { User } from "../user/user.model.js";
import { NotificationServices } from "./notification.service.js";

const isLoginPath = (path?: string) => {
  return (
    path === "/sign-in/email" ||
    path?.startsWith("/callback/") ||
    path?.startsWith("/oauth2/callback/")
  );
};

const createLoginSecurityAlert = async (payload: {
  betterAuthUserId: string;
  sessionId: string;
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
  path?: string | undefined;
}) => {
  if (!isLoginPath(payload.path)) {
    return;
  }

  const user = await User.findOne({
    betterAuthUserId: payload.betterAuthUserId,
  }).select("_id");

  if (!user) {
    return;
  }

  const ipAddress = payload.ipAddress || "unknown IP";
  const userAgent = payload.userAgent?.slice(0, 160) || "unknown device";

  await NotificationServices.createNotification({
    userId: user._id,
    type: "login-security",
    title: "New login detected",
    message: `A new login was detected from ${ipAddress} using ${userAgent}.`,
    eventKey: `login-security:${payload.sessionId}`,
  });
};

export const LoginSecurityServices = {
  createLoginSecurityAlert,
};
