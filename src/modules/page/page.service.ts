import { Types } from "mongoose";
import config from "../../config/index.js";
import AppError from "../../errors/AppError.js";
import { Page } from "./page.model.js";
import type { TAuthUser } from "../user/user.interface.js";
import { checkPlanLimit } from "../../utils/checkPlanLimit.js";
import { deletePageAnalytics } from "../../utils/analytics-cleanup.js";

const reservedPageSlugs = [
  "api",
  "admin",
  "dashboard",
  "login",
  "register",
  "pricing",
  "terms",
  "privacy",
  "settings",
  "auth",
  "links",
  "campaigns",
  "analytics",
  "pages",
  "u",
  "me",
];

const portfolioScalarFields = [
  "headline",
  "location",
  "contactEmail",
  "contactPhone",
  "websiteUrl",
  "resumeUrl",
  "availability",
  "careerSummary",
] as const;

const portfolioArrayFields = [
  "socialLinks",
  "skills",
  "experiences",
  "projects",
  "education",
  "certifications",
] as const;

const normalizeOrderedItems = (items?: Record<string, any>[]) =>
  items?.map((item, index) => ({
    ...item,
    order: item.order ?? index,
  }));

const buildPortfolioPatch = (payload: Record<string, any>) => {
  const result: Record<string, any> = {};

  portfolioScalarFields.forEach((field) => {
    if (payload[field] !== undefined) result[field] = payload[field];
  });

  portfolioArrayFields.forEach((field) => {
    if (payload[field] !== undefined) {
      result[field] = normalizeOrderedItems(payload[field]) ?? [];
    }
  });

  return result;
};

const buildPageResponse = (page: any) => {
  return {
    id: page._id,
    slug: page.slug,
    pageUrl: `${config.frontend_url}/me/${page.slug}`,
    title: page.title,
    bio: page.bio ?? null,
    avatarUrl: page.avatarUrl ?? null,
    headline: page.headline ?? null,
    location: page.location ?? null,
    contactEmail: page.contactEmail ?? null,
    contactPhone: page.contactPhone ?? null,
    websiteUrl: page.websiteUrl ?? null,
    resumeUrl: page.resumeUrl ?? null,
    availability: page.availability ?? null,
    careerSummary: page.careerSummary ?? null,
    theme: page.theme,
    links: page.links,
    socialLinks: page.socialLinks ?? [],
    skills: page.skills ?? [],
    experiences: page.experiences ?? [],
    projects: page.projects ?? [],
    education: page.education ?? [],
    certifications: page.certifications ?? [],
    visits: page.visits,
    isPublished: page.isPublished,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
};

const createPageIntoDB = async (
  payload: Record<string, any> & { slug: string; title: string },
  userPayload: TAuthUser,
) => {
  const userObjectId = new Types.ObjectId(userPayload.id);
  const totalPages = await Page.countDocuments({
    userId: userObjectId,
  });
  checkPlanLimit({
    plan: userPayload.plan,
    subscriptionStatus: userPayload.subscriptionStatus,
    key: "bioPages",
    currentUsage: totalPages,
  });
  const slug = payload.slug.toLowerCase();

  if (reservedPageSlugs.includes(slug)) {
    throw new AppError(
      400,
      "This page slug is reserved. Please use another one.",
    );
  }

  const existingPage = await Page.findOne({ slug });

  if (existingPage) {
    throw new AppError(409, "This page slug is already taken");
  }

  const normalizedLinks =
    payload.links?.map((link: Record<string, any>, index: number) => ({
      title: link.title,
      url: link.url,
      order: link.order ?? index,
      isActive: link.isActive ?? true,
    })) ?? [];

  const result = await Page.create({
    userId: userObjectId,
    slug,
    title: payload.title,
    bio: payload.bio ?? null,
    avatarUrl: payload.avatarUrl ?? null,
    ...buildPortfolioPatch(payload),
    theme: payload.theme ?? "light",
    links: normalizedLinks,
    isPublished: payload.isPublished ?? true,
  });

  return buildPageResponse(result);
};

const getMyPagesFromDB = async (userId: string) => {
  const result = await Page.find({
    userId: new Types.ObjectId(userId),
  }).sort({
    createdAt: -1,
  });

  return result.map((page) => buildPageResponse(page));
};

const getSinglePageFromDB = async (id: string, userId: string) => {
  const page = await Page.findOne({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
  });

  if (!page) {
    throw new AppError(404, "Page not found");
  }

  await deletePageAnalytics(page._id);

  return buildPageResponse(page);
};

const updatePageIntoDB = async (
  id: string,
  userPayload: TAuthUser,
  payload: Record<string, any>,
) => {
  const page = await Page.findOne({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userPayload.id),
  });

  if (!page) {
    throw new AppError(404, "Page not found");
  }

  if (payload.slug !== undefined) {
    const newSlug = payload.slug.toLowerCase();

    if (reservedPageSlugs.includes(newSlug)) {
      throw new AppError(
        400,
        "This page slug is reserved. Please use another one.",
      );
    }

    const existingPage = await Page.findOne({
      slug: newSlug,
      _id: { $ne: new Types.ObjectId(id) },
    });

    if (existingPage) {
      throw new AppError(409, "This page slug is already taken");
    }

    page.slug = newSlug;
  }

  if (payload.title !== undefined) {
    page.title = payload.title;
  }

  if (payload.bio !== undefined) {
    page.bio = payload.bio;
  }

  if (payload.avatarUrl !== undefined) {
    page.avatarUrl = payload.avatarUrl;
  }

  page.set(buildPortfolioPatch(payload));

  if (payload.theme !== undefined) {
    page.theme = payload.theme;
  }

  if (payload.links !== undefined) {
    page.links = payload.links.map((link: Record<string, any>, index: number) => ({
      _id: link._id ? new Types.ObjectId(link._id) : new Types.ObjectId(),
      title: link.title,
      url: link.url,
      order: link.order ?? index,
      isActive: link.isActive ?? true,
    }));
  }

  if (typeof payload.isPublished === "boolean") {
    page.isPublished = payload.isPublished;
  }

  const result = await page.save();

  return buildPageResponse(result);
};

const deletePageFromDB = async (id: string, userId: string) => {
  const page = await Page.findOneAndDelete({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
  });

  if (!page) {
    throw new AppError(404, "Page not found");
  }

  return buildPageResponse(page);
};

const getPublicPageBySlugFromDB = async (slug: string) => {
  const page = await Page.findOneAndUpdate(
    {
      slug: slug.toLowerCase(),
      isPublished: true,
    },
    {
      $inc: { visits: 1 },
    },
    {
      new: true,
    },
  );

  if (!page) {
    throw new AppError(404, "Page not found or unpublished");
  }
  // Persist embedded link IDs for pages created before link IDs were enabled.
  page.markModified("links");
  await page.save();

  const activeLinks = page.links
    .filter((link) => link.isActive)
    .sort((a, b) => a.order - b.order);

  const trackingLinks = activeLinks.map((link) => ({
    title: link.title,
    originalUrl: link.url,
    clickUrl: `${config.base_url}/api/pages/public/${page.slug}/click/${link._id}`,
    order: link.order,
    isActive: link.isActive,
  }));

  return {
    pageId: page._id,
    userId: page.userId,
    slug: page.slug,
    title: page.title,
    bio: page.bio ?? null,
    avatarUrl: page.avatarUrl ?? null,
    headline: page.headline ?? null,
    location: page.location ?? null,
    contactEmail: page.contactEmail ?? null,
    contactPhone: page.contactPhone ?? null,
    websiteUrl: page.websiteUrl ?? null,
    resumeUrl: page.resumeUrl ?? null,
    availability: page.availability ?? null,
    careerSummary: page.careerSummary ?? null,
    theme: page.theme,
    links: trackingLinks,
    socialLinks: (page.socialLinks ?? [])
      .filter((link) => link.isActive)
      .sort((a, b) => a.order - b.order),
    skills: (page.skills ?? []).sort((a, b) => a.order - b.order),
    experiences: (page.experiences ?? []).sort((a, b) => a.order - b.order),
    projects: (page.projects ?? [])
      .filter((project) => project.isActive)
      .sort((a, b) => a.order - b.order),
    education: (page.education ?? []).sort((a, b) => a.order - b.order),
    certifications: (page.certifications ?? []).sort(
      (a, b) => a.order - b.order,
    ),
    visits: page.visits,
  };
};

const getPublicPageLinkForRedirectFromDB = async (
  slug: string,
  linkId: string,
) => {
  const page = await Page.findOne({
    slug: slug.toLowerCase(),
    isPublished: true,
  });

  if (!page) {
    throw new AppError(404, "Page not found or unpublished");
  }

  const activeLinks = page.links
    .filter((link) => link.isActive)
    .sort((a, b) => a.order - b.order);

  const linkIndex = activeLinks.findIndex(
    (link) => link._id.toString() === linkId,
  );

  const selectedLink = activeLinks[linkIndex];

  if (!selectedLink) {
    throw new AppError(404, "Link not found");
  }

  return {
    pageId: page._id,
    userId: page.userId,
    slug: page.slug,
    linkIndex,
    linkTitle: selectedLink.title,
    linkUrl: selectedLink.url,
  };
};

export const PageServices = {
  createPageIntoDB,
  getMyPagesFromDB,
  getSinglePageFromDB,
  updatePageIntoDB,
  deletePageFromDB,
  getPublicPageBySlugFromDB,
  getPublicPageLinkForRedirectFromDB,
};
