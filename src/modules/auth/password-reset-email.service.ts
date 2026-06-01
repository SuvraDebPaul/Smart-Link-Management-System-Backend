import config from "../../config/index.js";

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

const sendPasswordResetEmail = async (to: string, resetUrl: string) => {
  if (!config.resend_api_key || !config.email_from) {
    throw new Error("Resend email delivery is not configured");
  }

  const safeResetUrl = escapeHtml(resetUrl);
  const response = await fetch(resendApiUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.resend_api_key}`,
      "content-type": "application/json",
      "user-agent": "SmartLink-Email/1.0",
    },
    body: JSON.stringify({
      from: config.email_from,
      to: [to],
      subject: "Reset your Smart Link password",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
          <h2>Reset your password</h2>
          <p>Use the button below to choose a new password. This link expires in one hour.</p>
          <p>
            <a href="${safeResetUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: #0891b2; color: #ffffff; text-decoration: none; font-weight: 700;">
              Reset password
            </a>
          </p>
          <p style="color: #64748b; font-size: 12px;">
            If you did not request this change, you can ignore this email.
          </p>
        </div>
      `,
      text: `Reset your Smart Link password\n\nOpen this link within one hour:\n${resetUrl}\n\nIf you did not request this change, ignore this email.`,
    }),
    signal: AbortSignal.timeout(emailTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Resend returned ${response.status}`);
  }
};

export const PasswordResetEmailServices = {
  sendPasswordResetEmail,
};
