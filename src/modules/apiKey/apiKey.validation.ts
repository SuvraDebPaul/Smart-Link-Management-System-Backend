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
  }),
});

export const ApiKeyValidations = {
  createApiKeyValidationSchema,
};
