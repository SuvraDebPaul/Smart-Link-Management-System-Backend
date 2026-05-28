import { Types } from "mongoose";
import config from "../../config/index.js";
import AppError from "../../errors/AppError.js";
import { Page } from "./page.model.js";

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
];

const buildPageResponse = (page: any) => {
  return {
    id: page._id,
    slug: page.slug,
    pageUrl: `${config.base_url}/u/${page.slug}`,
    title: page.title,
    bio: page.bio ?? null,
    avatarUrl: page.avatarUrl ?? null,
    theme: page.theme,
    links: page.links,
    visits: page.visits,
    isPublished: page.isPublished,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
};

const createPageIntoDB = async (
  payload: {
    slug: string;
    title: string;
    bio?: string | null;
    avatarUrl?: string | null;
    theme?: "light" | "dark" | "gradient";
    links?: {
      title: string;
      url: string;
      order?: number;
      isActive?: boolean;
    }[];
    isPublished?: boolean;
  },
  userId: string,
) => {
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
    payload.links?.map((link, index) => ({
      title: link.title,
      url: link.url,
      order: link.order ?? index,
      isActive: link.isActive ?? true,
    })) ?? [];

  const result = await Page.create({
    userId: new Types.ObjectId(userId),
    slug,
    title: payload.title,
    bio: payload.bio ?? null,
    avatarUrl: payload.avatarUrl ?? null,
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

  return buildPageResponse(page);
};

const updatePageIntoDB = async (
  id: string,
  userId: string,
  payload: {
    slug?: string;
    title?: string;
    bio?: string | null;
    avatarUrl?: string | null;
    theme?: "light" | "dark" | "gradient";
    links?: {
      title: string;
      url: string;
      order?: number;
      isActive?: boolean;
    }[];
    isPublished?: boolean;
  },
) => {
  const page = await Page.findOne({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
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

  if (payload.theme !== undefined) {
    page.theme = payload.theme;
  }

  if (payload.links !== undefined) {
    page.links = payload.links.map((link, index) => ({
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
  const page = await Page.findOne({
    slug: slug.toLowerCase(),
    isPublished: true,
  });

  if (!page) {
    throw new AppError(404, "Page not found or unpublished");
  }

  page.visits += 1;
  await page.save();

  const activeLinks = page.links
    .filter((link) => link.isActive)
    .sort((a, b) => a.order - b.order);

  const trackingLinks = activeLinks.map((link, index) => ({
    title: link.title,
    originalUrl: link.url,
    clickUrl: `${config.base_url}/api/pages/public/${page.slug}/click/${index}`,
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
    theme: page.theme,
    links: trackingLinks,
    visits: page.visits,
  };
};

const getPublicPageLinkForRedirectFromDB = async (
  slug: string,
  linkIndex: number,
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
