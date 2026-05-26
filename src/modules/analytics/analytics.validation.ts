import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const dateQuerySchema = z.object({
  startDate: z.string().datetime("Invalid startDate").optional(),
  endDate: z.string().datetime("Invalid endDate").optional(),
});

const dateFilterSchema = z.object({
  query: dateQuerySchema,
});

const linkIdValidationSchema = z.object({
  params: z.object({
    linkId: z.string().regex(objectIdRegex, "Invalid link ID"),
  }),
  query: dateQuerySchema,
});

const campaignIdValidationSchema = z.object({
  params: z.object({
    campaignId: z.string().regex(objectIdRegex, "Invalid campaign ID"),
  }),
  query: dateQuerySchema,
});

export const AnalyticsValidations = {
  dateFilterSchema,
  linkIdValidationSchema,
  campaignIdValidationSchema,
};
