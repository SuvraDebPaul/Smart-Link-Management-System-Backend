import type { Request, Response } from "express";
import AppError from "../../errors/AppError.js";
import { PageServices } from "./page.service.js";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { createPageVisit } from "../../utils/createPageVisit.js";
import { createPageLinkClick } from "../../utils/createPageLinkClick.js";

const createPage = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const result = await PageServices.createPageIntoDB(req.body, req.user.id);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Page created successfully",
    data: result,
  });
});

const getMyPages = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const result = await PageServices.getMyPagesFromDB(req.user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Pages retrieved successfully",
    data: result,
  });
});

const getSinglePage = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id) {
    throw new AppError(400, "Page id is required");
  }

  const result = await PageServices.getSinglePageFromDB(id, req.user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Page retrieved successfully",
    data: result,
  });
});

const updatePage = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id) {
    throw new AppError(400, "Page id is required");
  }

  const result = await PageServices.updatePageIntoDB(id, req.user.id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Page updated successfully",
    data: result,
  });
});

const deletePage = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "You are not authorized");
  }

  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id) {
    throw new AppError(400, "Page id is required");
  }

  const result = await PageServices.deletePageFromDB(id, req.user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Page deleted successfully",
    data: result,
  });
});

const getPublicPage = catchAsync(async (req: Request, res: Response) => {
  const rawSlug = req.params.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;

  if (!slug) {
    throw new AppError(400, "Page slug is required");
  }

  const result = await PageServices.getPublicPageBySlugFromDB(slug);

  await createPageVisit(req, {
    pageId: result.pageId,
    userId: result.userId,
    slug: result.slug,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Public page retrieved successfully",
    data: {
      slug: result.slug,
      title: result.title,
      bio: result.bio,
      avatarUrl: result.avatarUrl,
      theme: result.theme,
      links: result.links,
      visits: result.visits,
    },
  });
});

const redirectPublicPageLink = catchAsync(
  async (req: Request, res: Response) => {
    const { rawSlug, linkIndex } = req.params;

    const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
    if (!slug) {
      throw new AppError(400, "Page slug is required");
    }

    const result = await PageServices.getPublicPageLinkForRedirectFromDB(
      slug,
      Number(linkIndex),
    );

    await createPageLinkClick(req, {
      pageId: result.pageId,
      userId: result.userId,
      slug: result.slug,
      linkIndex: result.linkIndex,
      linkTitle: result.linkTitle,
      linkUrl: result.linkUrl,
    });

    res.redirect(result.linkUrl);
  },
);

export const PageControllers = {
  createPage,
  getMyPages,
  getSinglePage,
  updatePage,
  deletePage,
  getPublicPage,
  redirectPublicPageLink,
};
