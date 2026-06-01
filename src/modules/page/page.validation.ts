import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const slugRegex = /^[a-z0-9-]+$/;
const httpUrlSchema = z.url("Please provide a valid URL").refine((value) => {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}, "Only HTTP and HTTPS URLs are allowed");

const pageLinkSchema = z.object({
  _id: z.string().regex(objectIdRegex, "Invalid page link ID").optional(),

  title: z
    .string()
    .min(1, "Link title is required")
    .max(80, "Link title must not be more than 80 characters"),

  url: httpUrlSchema,

  order: z
    .number()
    .int("Order must be an integer")
    .min(0, "Order cannot be negative")
    .optional(),

  isActive: z.boolean().optional(),
});

const nullableText = (max: number, message: string) =>
  z.string().max(max, message).nullable().optional();

const nullableHttpUrl = httpUrlSchema.nullable().optional();

const orderSchema = z
  .number()
  .int("Order must be an integer")
  .min(0, "Order cannot be negative")
  .optional();

const socialLinkSchema = z.object({
  platform: z.string().min(1, "Social platform is required").max(40),
  title: z.string().min(1, "Social title is required").max(80),
  url: httpUrlSchema,
  order: orderSchema,
  isActive: z.boolean().optional(),
});

const skillSchema = z.object({
  name: z.string().min(1, "Skill name is required").max(60),
  category: nullableText(60, "Skill category must not exceed 60 characters"),
  level: z
    .enum(["beginner", "intermediate", "advanced", "expert"])
    .nullable()
    .optional(),
  order: orderSchema,
});

const experienceSchema = z
  .object({
    company: z.string().min(1, "Company is required").max(100),
    role: z.string().min(1, "Role is required").max(100),
    location: nullableText(100, "Location must not exceed 100 characters"),
    startDate: nullableText(30, "Start date must not exceed 30 characters"),
    endDate: nullableText(30, "End date must not exceed 30 characters"),
    isCurrent: z.boolean().optional(),
    summary: nullableText(1000, "Experience summary must not exceed 1000 characters"),
    highlights: z.array(z.string().min(1).max(200)).max(10).optional(),
    order: orderSchema,
  })
  .superRefine((data, ctx) => {
    if (data.isCurrent && data.endDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "A current position cannot have an end date",
      });
    }
  });

const projectSchema = z.object({
  title: z.string().min(1, "Project title is required").max(100),
  summary: nullableText(1000, "Project summary must not exceed 1000 characters"),
  imageUrl: nullableHttpUrl,
  projectUrl: nullableHttpUrl,
  repositoryUrl: nullableHttpUrl,
  techStack: z.array(z.string().min(1).max(40)).max(20).optional(),
  featured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  order: orderSchema,
});

const educationSchema = z.object({
  institution: z.string().min(1, "Institution is required").max(120),
  degree: z.string().min(1, "Degree is required").max(120),
  field: nullableText(120, "Field must not exceed 120 characters"),
  startDate: nullableText(30, "Start date must not exceed 30 characters"),
  endDate: nullableText(30, "End date must not exceed 30 characters"),
  summary: nullableText(500, "Education summary must not exceed 500 characters"),
  order: orderSchema,
});

const certificationSchema = z.object({
  name: z.string().min(1, "Certification name is required").max(120),
  issuer: nullableText(120, "Issuer must not exceed 120 characters"),
  issueDate: nullableText(30, "Issue date must not exceed 30 characters"),
  credentialUrl: nullableHttpUrl,
  order: orderSchema,
});

const portfolioFields = {
  headline: nullableText(120, "Headline must not exceed 120 characters"),
  location: nullableText(100, "Location must not exceed 100 characters"),
  contactEmail: z.email("Please provide a valid contact email").nullable().optional(),
  contactPhone: nullableText(40, "Phone number must not exceed 40 characters"),
  websiteUrl: nullableHttpUrl,
  resumeUrl: nullableHttpUrl,
  availability: nullableText(120, "Availability must not exceed 120 characters"),
  careerSummary: nullableText(2000, "Career summary must not exceed 2000 characters"),
  socialLinks: z.array(socialLinkSchema).max(12, "Maximum 12 social links allowed").optional(),
  skills: z.array(skillSchema).max(40, "Maximum 40 skills allowed").optional(),
  experiences: z.array(experienceSchema).max(20, "Maximum 20 experiences allowed").optional(),
  projects: z.array(projectSchema).max(20, "Maximum 20 projects allowed").optional(),
  education: z.array(educationSchema).max(10, "Maximum 10 education entries allowed").optional(),
  certifications: z.array(certificationSchema).max(20, "Maximum 20 certifications allowed").optional(),
};

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

    avatarUrl: httpUrlSchema.nullable().optional(),

    ...portfolioFields,

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

      avatarUrl: httpUrlSchema.nullable().optional(),

      ...portfolioFields,

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

    linkId: z.string().regex(objectIdRegex, "Invalid page link ID"),
  }),
});

export const PageValidations = {
  createPageValidationSchema,
  updatePageValidationSchema,
  pageIdValidationSchema,
  publicPageValidationSchema,
  publicPageLinkClickValidationSchema,
};
