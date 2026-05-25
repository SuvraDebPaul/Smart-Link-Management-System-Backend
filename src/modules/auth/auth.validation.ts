import z from "zod";

const registerValidationSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.email("Please provide a valid email address"),
    password: z.string().min(6, "Password must be at least 6 character"),
  }),
});

const loginValidationSchema = z.object({
  body: z.object({
    email: z.email("Please provide a valid email address"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const AuthValidations = {
  registerValidationSchema,
  loginValidationSchema,
};
