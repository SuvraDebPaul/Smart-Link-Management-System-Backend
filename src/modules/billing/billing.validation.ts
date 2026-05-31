import { z } from "zod";

const createCheckoutSessionSchema = z.object({
  body: z.object({
    plan: z.enum(["starter", "pro"]),
  }),
});

export const BillingValidations = {
  createCheckoutSessionSchema,
};
