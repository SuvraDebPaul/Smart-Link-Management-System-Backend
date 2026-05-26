import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const slugRegex = /^[a-z0-9-]+$/;

const pageLinkSchema = z.object({
  title: z
    .string()
    .min(1, "Link title is required")
    .max(80, "Link title must not be more than 80 characters"),

  url: z.url("Please provide a valid link URL"),

  order: z
    .number()
    .int("Order must be an integer")
    .min(0, "Order cannot be negative")
    .optional(),

  isActive: z.boolean().optional(),
});

const createPageValidationSchema = z.object({
  body: z.object({
    slug: z
      .string()
      .min(3, "Slug must be at least 3 characters")
      .max(40, "Slug must not be more than 40 characters")
      .regex(
        slugRegex,
        "Slug can contain only lowercase letters, numbers, and hyphens",
      ),

    title: z
      .string()
      .min(2, "Title must be at least 2 characters")
      .max(100, "Title must not be more than 100 characters"),

    bio: z
      .string()
      .max(300, "Bio must not be more than 300 characters")
      .nullable()
      .optional(),

    avatarUrl: z.url("Please provide a valid avatar URL").nullable().optional(),

    theme: z.enum(["light", "dark", "gradient"]).optional(),

    links: z
      .array(pageLinkSchema)
      .max(30, "Maximum 30 links allowed")
      .optional(),

    isPublished: z.boolean().optional(),
  }),
});

const updatePageValidationSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid page ID"),
  }),

  body: z
    .object({
      slug: z
        .string()
        .min(3, "Slug must be at least 3 characters")
        .max(40, "Slug must not be more than 40 characters")
        .regex(
          slugRegex,
          "Slug can contain only lowercase letters, numbers, and hyphens",
        )
        .optional(),

      title: z
        .string()
        .min(2, "Title must be at least 2 characters")
        .max(100, "Title must not be more than 100 characters")
        .optional(),

      bio: z
        .string()
        .max(300, "Bio must not be more than 300 characters")
        .nullable()
        .optional(),

      avatarUrl: z
        .url("Please provide a valid avatar URL")
        .nullable()
        .optional(),

      theme: z.enum(["light", "dark", "gradient"]).optional(),

      links: z
        .array(pageLinkSchema)
        .max(30, "Maximum 30 links allowed")
        .optional(),

      isPublished: z.boolean().optional(),
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

const pageIdValidationSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid page ID"),
  }),
});

const publicPageValidationSchema = z.object({
  params: z.object({
    slug: z
      .string()
      .min(3, "Slug must be at least 3 characters")
      .max(40, "Slug must not be more than 40 characters")
      .regex(slugRegex, "Invalid page slug"),
  }),
});

const publicPageLinkClickValidationSchema = z.object({
  params: z.object({
    slug: z
      .string()
      .min(3, "Slug must be at least 3 characters")
      .max(40, "Slug must not be more than 40 characters")
      .regex(slugRegex, "Invalid page slug"),

    linkIndex: z.string().regex(/^\d+$/, "Link index must be a number"),
  }),
});

export const PageValidations = {
  createPageValidationSchema,
  updatePageValidationSchema,
  pageIdValidationSchema,
  publicPageValidationSchema,
  publicPageLinkClickValidationSchema,
};
