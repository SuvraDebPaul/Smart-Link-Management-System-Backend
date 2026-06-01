import { z } from "zod";

const createApiKeyValidationSchema = z.object({
  body: z.object({
    name: z
      .string({
        error: "API key name is required",
      })
      .trim()
      .min(2, "API key name must be at least 2 characters")
      .max(50, "API key name cannot be more than 50 characters"),
    expiryDays: z
      .number()
      .int("Expiry days must be an integer")
      .positive("Expiry days must be greater than 0")
      .max(3650, "Expiry days cannot be more than 3650")
      .nullable()
      .optional(),
  }),
});

const apiKeyIdParamsValidationSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Valid API key id is required"),
  }),
});

export const ApiKeyValidations = {
  createApiKeyValidationSchema,
  apiKeyIdParamsValidationSchema,
};
