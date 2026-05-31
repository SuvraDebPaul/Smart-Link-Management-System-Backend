import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const dateValueSchema = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Invalid date",
  });

const dateQuerySchema = z
  .object({
    startDate: dateValueSchema.optional(),
    endDate: dateValueSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.startDate &&
      data.endDate &&
      new Date(data.endDate) < new Date(data.startDate)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date cannot be before start date",
      });
    }
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

const pageIdValidationSchema = z.object({
  params: z.object({
    pageId: z.string().regex(objectIdRegex, "Invalid page ID"),
  }),
  query: dateQuerySchema,
});

export const AnalyticsValidations = {
  dateFilterSchema,
  linkIdValidationSchema,
  campaignIdValidationSchema,
  pageIdValidationSchema,
};
