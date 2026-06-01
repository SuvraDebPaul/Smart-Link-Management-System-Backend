import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const optionalUrl = z.string().url("Please provide a valid URL").nullable().optional();
const utmPresetSchema = z.object({
  source: z.string().max(100).nullable().optional(),
  medium: z.string().max(100).nullable().optional(),
  campaign: z.string().max(100).nullable().optional(),
  term: z.string().max(100).nullable().optional(),
  content: z.string().max(100).nullable().optional(),
}).optional();
const campaignMetadataSchema = {
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  budget: z.number().min(0).nullable().optional(),
  conversions: z.number().int().min(0).optional(),
  revenue: z.number().min(0).nullable().optional(),
  primaryUrl: optionalUrl,
  isTemplate: z.boolean().optional(),
  utmPreset: utmPresetSchema,
  reportFrequency: z.enum(["none", "daily", "weekly"]).optional(),
  notes: z.string().max(2000).nullable().optional(),
  clientName: z.string().max(100).nullable().optional(),
  clientEmail: z.string().email("Please provide a valid client email").max(200).nullable().optional(),
  clientPhone: z.string().max(50).nullable().optional(),
  clientCompany: z.string().max(150).nullable().optional(),
};

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
    ...campaignMetadataSchema,
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
      isArchived: z.boolean().optional(),

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
      ...campaignMetadataSchema,
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
const campaignBulkLinkValidationSchema = z.object({
  params: z.object({ id: z.string().regex(objectIdRegex, "Invalid campaign ID") }),
  body: z.object({
    linkIds: z.array(z.string().regex(objectIdRegex, "Invalid link ID")).min(1).max(100),
    action: z.enum(["remove", "activate", "pause", "archive", "restore"]),
  }),
});
const shareCampaignValidationSchema = z.object({
  params: z.object({ id: z.string().regex(objectIdRegex, "Invalid campaign ID") }),
  body: z.object({ enabled: z.boolean() }),
});

export const CampaignValidations = {
  createCampaignValidationSchema,
  updateCampaignValidationSchema,
  campaignIdValidationSchema,
  campaignLinkIdValidationSchema,
  campaignBulkLinkValidationSchema,
  shareCampaignValidationSchema,
};
