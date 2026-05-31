import { z } from "zod";

const updateUserRoleSchema = z.object({
  body: z.object({
    role: z.enum(["user", "admin"]),
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

export const AdminValidations = {
  updateUserRoleSchema,
  updateLinkStatusSchema,
  updateDomainStatusSchema,
};
