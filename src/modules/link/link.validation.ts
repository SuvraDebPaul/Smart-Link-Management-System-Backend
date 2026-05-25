import z from "zod";

const objectRegex = /^[0-9a-fA-F]{24}$/;

const createLinkValidationSchema = z.object({
  body: z.object({
    originalUrl: z.url("Please provide a valid url"),
    customAlias: z.string().min(3).max(30).optional(),
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

export const LinkValidations = {
  createLinkValidationSchema,
  getSingleLinkValidationSchema,
  updateLinkValidationSchema,
  deleteLinkValidationSchema,
};
