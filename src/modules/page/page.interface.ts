import { Types } from "mongoose";

export type TPageTheme = "light" | "dark" | "gradient";

export interface IPageLink {
  _id: Types.ObjectId;
  title: string;
  url: string;
  order: number;
  isActive: boolean;
}

export interface IPageSocialLink {
  platform: string;
  title: string;
  url: string;
  order: number;
  isActive: boolean;
}

export interface IPageSkill {
  name: string;
  category?: string | null;
  level?: "beginner" | "intermediate" | "advanced" | "expert" | null;
  order: number;
}

export interface IPageExperience {
  company: string;
  role: string;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent: boolean;
  summary?: string | null;
  highlights: string[];
  order: number;
}

export interface IPageProject {
  title: string;
  summary?: string | null;
  imageUrl?: string | null;
  projectUrl?: string | null;
  repositoryUrl?: string | null;
  techStack: string[];
  featured: boolean;
  isActive: boolean;
  order: number;
}

export interface IPageEducation {
  institution: string;
  degree: string;
  field?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  summary?: string | null;
  order: number;
}

export interface IPageCertification {
  name: string;
  issuer?: string | null;
  issueDate?: string | null;
  credentialUrl?: string | null;
  order: number;
}

export interface IPage {
  userId: Types.ObjectId;
  slug: string;
  title: string;
  bio?: string | null;
  avatarUrl?: string | null;
  headline?: string | null;
  location?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  websiteUrl?: string | null;
  resumeUrl?: string | null;
  availability?: string | null;
  careerSummary?: string | null;
  theme: TPageTheme;
  links: IPageLink[];
  socialLinks: IPageSocialLink[];
  skills: IPageSkill[];
  experiences: IPageExperience[];
  projects: IPageProject[];
  education: IPageEducation[];
  certifications: IPageCertification[];
  visits: number;
  isPublished: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}
