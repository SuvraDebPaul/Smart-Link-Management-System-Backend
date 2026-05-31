import z from "zod";
import { isIP } from "node:net";

const notificationPreferencesSchema = z.object({
  weeklyAnalyticsReport: z.boolean(),
  campaignGoalReached: z.boolean(),
  linkMaxClicksReached: z.boolean(),
  domainVerificationFailed: z.boolean(),
  securityLoginAlert: z.boolean(),
  billingSubscriptionAlert: z.boolean(),
});

const apiSecurityPreferencesSchema = z.object({
  defaultApiKeyExpiryDays: z
    .number()
    .int()
    .min(1)
    .max(3650)
    .nullable(),
  allowedIpAddresses: z
    .array(
      z.string().refine((value) => isIP(value) !== 0, {
        message: "Please provide a valid IP address",
      }),
    )
    .max(50),
  webhookUrl: z
    .url()
    .refine((value) => value.startsWith("http://") || value.startsWith("https://"), {
      message: "Webhook URL must use HTTP or HTTPS",
    })
    .nullable(),
});

const qrDefaultPreferencesSchema = z.object({
  foregroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid foreground color"),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid background color"),
  size: z.number().int().min(128).max(2048),
  downloadFormat: z.enum(["png", "svg"]),
});

const updateMeValidationSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
    companyName: z.string().optional(),
    timezone: z.string().optional(),
    notificationPreferences: notificationPreferencesSchema.optional(),
    apiSecurityPreferences: apiSecurityPreferencesSchema.optional(),
    qrDefaultPreferences: qrDefaultPreferencesSchema.optional(),
  }),
});

const changePasswordValidationSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
  }),
});

const deleteAccountValidationSchema = z.object({
  body: z.object({
    password: z.string().min(1, "Password is required"),
    confirmationText: z.literal("DELETE"),
  }),
});

export const UserValidations = {
  updateMeValidationSchema,
  changePasswordValidationSchema,
  deleteAccountValidationSchema,
};
