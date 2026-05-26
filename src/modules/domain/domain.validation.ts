import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/;

const createDomainValidationSchema = z.object({
  body: z.object({
    domain: z
      .string()
      .min(4, "Domain must be at least 4 characters")
      .max(253, "Domain must not be more than 253 characters")
      .regex(domainRegex, "Please provide a valid domain"),
  }),
});

const updateDomainValidationSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid domain ID"),
  }),

  body: z
    .object({
      isActive: z.boolean().optional(),
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

const domainIdValidationSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid domain ID"),
  }),
});

export const DomainValidations = {
  createDomainValidationSchema,
  updateDomainValidationSchema,
  domainIdValidationSchema,
};
