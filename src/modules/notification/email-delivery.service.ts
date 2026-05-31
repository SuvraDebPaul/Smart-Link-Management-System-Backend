import config from "../../config/index.js";
import type { TNotificationType } from "./notification.interface.js";

const resendApiUrl = "https://api.resend.com/emails";
const emailTimeoutMs = 5000;

const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const deliverNotificationEmail = async (
  to: string,
  notification: {
    type: TNotificationType;
    title: string;
    message: string;
    eventKey: string;
  },
) => {
  if (!config.resend_api_key || !config.email_from) {
    throw new Error("Resend email delivery is not configured");
  }

  const response = await fetch(resendApiUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.resend_api_key}`,
      "content-type": "application/json",
      "idempotency-key": notification.eventKey,
      "user-agent": "SmartLink-Email/1.0",
    },
    body: JSON.stringify({
      from: config.email_from,
      to: [to],
      subject: notification.title,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
          <h2>${escapeHtml(notification.title)}</h2>
          <p>${escapeHtml(notification.message)}</p>
          <p style="color: #64748b; font-size: 12px;">
            Smart Link notification: ${escapeHtml(notification.type)}
          </p>
        </div>
      `,
      text: `${notification.title}\n\n${notification.message}`,
    }),
    signal: AbortSignal.timeout(emailTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Resend returned ${response.status}`);
  }
};

export const EmailDeliveryServices = {
  deliverNotificationEmail,
};
