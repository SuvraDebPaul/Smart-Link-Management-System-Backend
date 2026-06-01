import { z } from "zod";

const createContactSubmissionValidationSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(80, "Name must not be more than 80 characters"),
    email: z
      .string()
      .trim()
      .email("Please provide a valid email address")
      .max(160, "Email must not be more than 160 characters"),
    topic: z.enum(["general", "billing", "technical", "business"]),
    message: z
      .string()
      .trim()
      .min(10, "Message must be at least 10 characters")
      .max(2000, "Message must not be more than 2000 characters"),
  }),
});

export const ContactValidations = {
  createContactSubmissionValidationSchema,
};
