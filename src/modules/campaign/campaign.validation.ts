import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createCampaignValidationSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Campaign name must be at least 2 characters")
      .max(100, "Campaign name must not be more than 100 characters"),

    description: z.string().max(500).nullable().optional(),

    status: z.enum(["active", "paused", "completed"]).optional(),

    startDate: z
      .string()
      .datetime("Please provide a valid ISO start date")
      .nullable()
      .optional(),

    endDate: z
      .string()
      .datetime("Please provide a valid ISO end date")
      .nullable()
      .optional(),

    goalClicks: z
      .number()
      .int("Goal clicks must be an integer")
      .positive("Goal clicks must be greater than 0")
      .nullable()
      .optional(),
  }),
});

const updateCampaignValidationSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid campaign ID"),
  }),

  body: z
    .object({
      name: z
        .string()
        .min(2, "Campaign name must be at least 2 characters")
        .max(100, "Campaign name must not be more than 100 characters")
        .optional(),

      description: z.string().max(500).nullable().optional(),

      status: z.enum(["active", "paused", "completed"]).optional(),

      startDate: z
        .string()
        .datetime("Please provide a valid ISO start date")
        .nullable()
        .optional(),

      endDate: z
        .string()
        .datetime("Please provide a valid ISO end date")
        .nullable()
        .optional(),

      goalClicks: z
        .number()
        .int("Goal clicks must be an integer")
        .positive("Goal clicks must be greater than 0")
        .nullable()
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (Object.keys(data).length === 0) {
        ctx.addIssue({
          code: "custom",
          path: [],
          message: "At least one field is required to update",
        });
      }
    }),
});

const campaignIdValidationSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid campaign ID"),
  }),
});

const campaignLinkIdValidationSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid campaign ID"),
    linkId: z.string().regex(objectIdRegex, "Invalid link ID"),
  }),
});

export const CampaignValidations = {
  createCampaignValidationSchema,
  updateCampaignValidationSchema,
  campaignIdValidationSchema,
  campaignLinkIdValidationSchema,
};
