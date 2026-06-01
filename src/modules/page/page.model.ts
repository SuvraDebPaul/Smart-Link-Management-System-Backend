import { model, Schema } from "mongoose";
import type {
  IPage,
  IPageCertification,
  IPageEducation,
  IPageExperience,
  IPageLink,
  IPageProject,
  IPageSkill,
  IPageSocialLink,
} from "./page.interface.js";

const pageLinkSchema = new Schema<IPageLink>({
  title: {
    type: String,
    required: [true, "Link title is required"],
    trim: true,
  },

  url: {
    type: String,
    required: [true, "Link URL is required"],
    trim: true,
  },

  order: {
    type: Number,
    required: [true, "Link order is required"],
    default: 0,
  },

  isActive: {
    type: Boolean,
    default: true,
  },
});

const pageSocialLinkSchema = new Schema<IPageSocialLink>({
  platform: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
});

const pageSkillSchema = new Schema<IPageSkill>({
  name: { type: String, required: true, trim: true },
  category: { type: String, default: null, trim: true },
  level: {
    type: String,
    enum: ["beginner", "intermediate", "advanced", "expert", null],
    default: null,
  },
  order: { type: Number, default: 0 },
});

const pageExperienceSchema = new Schema<IPageExperience>({
  company: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true },
  location: { type: String, default: null, trim: true },
  startDate: { type: String, default: null, trim: true },
  endDate: { type: String, default: null, trim: true },
  isCurrent: { type: Boolean, default: false },
  summary: { type: String, default: null, trim: true },
  highlights: { type: [String], default: [] },
  order: { type: Number, default: 0 },
});

const pageProjectSchema = new Schema<IPageProject>({
  title: { type: String, required: true, trim: true },
  summary: { type: String, default: null, trim: true },
  imageUrl: { type: String, default: null, trim: true },
  projectUrl: { type: String, default: null, trim: true },
  repositoryUrl: { type: String, default: null, trim: true },
  techStack: { type: [String], default: [] },
  featured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
});

const pageEducationSchema = new Schema<IPageEducation>({
  institution: { type: String, required: true, trim: true },
  degree: { type: String, required: true, trim: true },
  field: { type: String, default: null, trim: true },
  startDate: { type: String, default: null, trim: true },
  endDate: { type: String, default: null, trim: true },
  summary: { type: String, default: null, trim: true },
  order: { type: Number, default: 0 },
});

const pageCertificationSchema = new Schema<IPageCertification>({
  name: { type: String, required: true, trim: true },
  issuer: { type: String, default: null, trim: true },
  issueDate: { type: String, default: null, trim: true },
  credentialUrl: { type: String, default: null, trim: true },
  order: { type: Number, default: 0 },
});

const pageSchema = new Schema<IPage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },

    slug: {
      type: String,
      required: [true, "Page slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, "Page title is required"],
      trim: true,
    },

    bio: {
      type: String,
      default: null,
      trim: true,
    },

    avatarUrl: {
      type: String,
      default: null,
      trim: true,
    },

    headline: { type: String, default: null, trim: true },
    location: { type: String, default: null, trim: true },
    contactEmail: { type: String, default: null, trim: true },
    contactPhone: { type: String, default: null, trim: true },
    websiteUrl: { type: String, default: null, trim: true },
    resumeUrl: { type: String, default: null, trim: true },
    availability: { type: String, default: null, trim: true },
    careerSummary: { type: String, default: null, trim: true },

    theme: {
      type: String,
      enum: ["light", "dark", "gradient"],
      default: "light",
    },

    links: {
      type: [pageLinkSchema],
      default: [],
    },

    socialLinks: { type: [pageSocialLinkSchema], default: [] },
    skills: { type: [pageSkillSchema], default: [] },
    experiences: { type: [pageExperienceSchema], default: [] },
    projects: { type: [pageProjectSchema], default: [] },
    education: { type: [pageEducationSchema], default: [] },
    certifications: { type: [pageCertificationSchema], default: [] },

    visits: {
      type: Number,
      default: 0,
    },

    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Page = model<IPage>("Page", pageSchema);
