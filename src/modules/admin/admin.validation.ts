import { z } from "zod";

const updateUserRoleSchema = z.object({
  body: z.object({
    role: z.enum(["user", "admin"]),
  }),
});

const updateUserPlanSchema = z.object({
  body: z.object({
    plan: z.enum(["free", "starter", "pro", "lifetime"]),
  }),
});

const updateLinkStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean(),
  }),
});

const updateDomainStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean(),
  }),
});

const updateContactSubmissionStatusSchema = z.object({
  body: z.object({
    status: z.enum(["new", "in-progress", "resolved"]),
  }),
});

export const AdminValidations = {
  updateUserRoleSchema,
  updateUserPlanSchema,
  updateLinkStatusSchema,
  updateDomainStatusSchema,
  updateContactSubmissionStatusSchema,
};
