import z from "zod";

const objectRegex = /^[0-9a-fA-F]{24}$/;
const httpUrlSchema = z.url("Please provide a valid URL").refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === "http:" || protocol === "https:";
}, "Only HTTP and HTTPS URLs are allowed");

const createLinkValidationSchema = z.object({
  body: z.object({
    originalUrl: httpUrlSchema,
    customAlias: z
      .string()
      .min(3)
      .max(30)
      .regex(
        /^[a-zA-Z0-9-]+$/,
        "Alias can contain only letters, numbers, and hyphens",
      )
      .optional(),
    password: z
      .string()
      .min(4, "Password must be at least 4 characters")
      .optional(),
    expiresAt: z.iso.datetime("Please provide a valid ISO date").optional(),
    maxClicks: z
      .number()
      .int("Max clicks must be an integer")
      .positive("Max clicks must be greater than 0")
      .optional(),
    campaignId: z
      .string()
      .regex(objectRegex, "Invalid campaign ID")
      .nullable()
      .optional(),
    domainId: z
      .string()
      .regex(objectRegex, "Invalid domain ID")
      .nullable()
      .optional(),
  }),
});

const createGuestLinkValidationSchema = z.object({
  body: z.object({
    originalUrl: httpUrlSchema,
    customAlias: z
      .string()
      .min(3)
      .max(30)
      .regex(
        /^[a-zA-Z0-9-]+$/,
        "Alias can contain only letters, numbers, and hyphens",
      )
      .optional(),
    password: z
      .string()
      .min(4, "Password must be at least 4 characters")
      .optional(),
    expiresAt: z.iso.datetime("Please provide a valid ISO date").optional(),
  }),
});

const getSingleLinkValidationSchema = z.object({
  params: z.object({
    id: z.string().regex(objectRegex, "Invalid link ID"),
  }),
});

const updateLinkValidationSchema = z.object({
  params: z.object({
    id: z.string().regex(objectRegex, "Invalid link ID"),
  }),

  body: z
    .object({
      originalUrl: httpUrlSchema.optional(),
      customAlias: z
        .string()
        .min(3)
        .max(30)
        .regex(
          /^[a-zA-Z0-9-]+$/,
          "Alias can contain only letters, numbers, and hyphens",
        )
        .optional(),
      isActive: z.boolean().optional(),
      password: z
        .string()
        .min(4, "Password must be at least 4 characters")
        .optional(),

      removePassword: z.boolean().optional(),
      expiresAt: z.iso
        .datetime("Please provide a valid ISO date")
        .nullable()
        .optional(),

      maxClicks: z
        .number()
        .int("Max clicks must be an integer")
        .positive("Max clicks must be greater than 0")
        .nullable()
        .optional(),
      campaignId: z
        .string()
        .regex(objectRegex, "Invalid campaign ID")
        .nullable()
        .optional(),
      domainId: z
        .string()
        .regex(objectRegex, "Invalid domain ID")
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

const deleteLinkValidationSchema = z.object({
  params: z.object({
    id: z.string().regex(objectRegex, "Invalid link ID"),
  }),
});

const unlockLinkValidationSchema = z.object({
  params: z.object({
    shortCode: z.string().min(1, "Short code is required"),
  }),
  body: z.object({
    password: z.string().min(1, "Password is required"),
    host: z.string().min(1, "Host is required"),
  }),
});

export const LinkValidations = {
  createLinkValidationSchema,
  createGuestLinkValidationSchema,
  getSingleLinkValidationSchema,
  updateLinkValidationSchema,
  deleteLinkValidationSchema,
  unlockLinkValidationSchema,
};
