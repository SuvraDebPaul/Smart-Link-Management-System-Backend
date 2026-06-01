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

const sendVerificationEmail = async (to: string, verificationUrl: string) => {
  if (!config.resend_api_key || !config.email_from) {
    throw new Error("Resend email delivery is not configured");
  }

  const safeVerificationUrl = escapeHtml(verificationUrl);
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
      subject: "Verify your Smart Link email",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
          <h2>Verify your email</h2>
          <p>Confirm your email address to finish setting up your Smart Link account.</p>
          <p>
            <a href="${safeVerificationUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: #0891b2; color: #ffffff; text-decoration: none; font-weight: 700;">
              Verify email
            </a>
          </p>
          <p style="color: #64748b; font-size: 12px;">
            This link expires in one hour. If you did not create this account, ignore this email.
          </p>
        </div>
      `,
      text: `Verify your Smart Link email\n\nOpen this link within one hour:\n${verificationUrl}\n\nIf you did not create this account, ignore this email.`,
    }),
    signal: AbortSignal.timeout(emailTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Resend returned ${response.status}`);
  }
};

export const EmailVerificationServices = {
  sendVerificationEmail,
};
