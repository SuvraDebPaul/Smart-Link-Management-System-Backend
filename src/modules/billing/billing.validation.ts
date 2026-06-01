import { z } from "zod";

const createCheckoutSessionSchema = z.object({
  body: z.object({
    plan: z.enum(["starter", "pro", "lifetime"]),
    billingInterval: z.enum(["monthly", "yearly"]).optional(),
  }),
});

export const BillingValidations = {
  createCheckoutSessionSchema,
};
