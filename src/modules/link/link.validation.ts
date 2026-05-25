import z from "zod";

const objectRegex = /^[0-9a-fA-F]{24}$/;

const createLinkValidationSchema = z.object({
  body: z.object({
    originalUrl: z.url("Please provide a valid url"),
    customAlias: z.string().min(3).max(30).optional(),
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
      originalUrl: z.url("Please provide a valid URL").optional(),
      customAlias: z.string().min(3).max(30).optional(),
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
    })
    .refine((data) => {
      (Object.keys(data).length > 0,
        "At Least one field is required to update");
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
  }),
});

export const LinkValidations = {
  createLinkValidationSchema,
  getSingleLinkValidationSchema,
  updateLinkValidationSchema,
  deleteLinkValidationSchema,
  unlockLinkValidationSchema,
};
