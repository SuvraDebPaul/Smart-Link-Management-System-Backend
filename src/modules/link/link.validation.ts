import z from "zod";

const objectRegex = /^[0-9a-fA-F]{24}$/;
const httpUrlSchema = z.url("Please provide a valid URL").refine((value) => {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}, "Only HTTP and HTTPS URLs are allowed");
const tagsSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, "Tag must not be empty")
      .max(30, "Tag must not be more than 30 characters")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Tags can contain only letters, numbers, underscores, and hyphens",
      ),
  )
  .max(10, "You can add up to 10 tags")
  .optional();
const folderSchema = z
  .string()
  .trim()
  .min(1, "Folder must not be empty")
  .max(50, "Folder must not be more than 50 characters")
  .regex(
    /^[a-zA-Z0-9 _-]+$/,
    "Folder can contain only letters, numbers, spaces, underscores, and hyphens",
  )
  .nullable()
  .optional();
const notesSchema = z
  .string()
  .trim()
  .max(500, "Notes must not be more than 500 characters")
  .nullable()
  .optional();

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
    startsAt: z.iso.datetime("Please provide a valid ISO date").optional(),
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
    tags: tagsSchema,
    folder: folderSchema,
    notes: notesSchema,
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

const bulkLinkItemSchema = z.object({
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
  expiresAt: z.iso.datetime("Please provide a valid ISO date").optional(),
  startsAt: z.iso.datetime("Please provide a valid ISO date").optional(),
  maxClicks: z
    .number()
    .int("Max clicks must be an integer")
    .positive("Max clicks must be greater than 0")
    .optional(),
  tags: tagsSchema,
  folder: folderSchema,
  notes: notesSchema,
});

const createBulkLinksValidationSchema = z.object({
  body: z.object({
    links: z
      .array(bulkLinkItemSchema)
      .min(1, "At least one link is required")
      .max(100, "You can import up to 100 links at a time"),
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
      isFavorite: z.boolean().optional(),
      isArchived: z.boolean().optional(),
      password: z
        .string()
        .min(4, "Password must be at least 4 characters")
        .optional(),

      removePassword: z.boolean().optional(),
      startsAt: z.iso
        .datetime("Please provide a valid ISO date")
        .nullable()
        .optional(),
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
      tags: tagsSchema,
      folder: folderSchema,
      notes: notesSchema,
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
  createBulkLinksValidationSchema,
  createGuestLinkValidationSchema,
  getSingleLinkValidationSchema,
  updateLinkValidationSchema,
  deleteLinkValidationSchema,
  unlockLinkValidationSchema,
};
