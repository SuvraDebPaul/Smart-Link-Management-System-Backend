import { Types } from "mongoose";

export interface IPageLinkClick {
  pageId: Types.ObjectId;
  userId: Types.ObjectId;
  slug: string;

  linkIndex: number;
  linkTitle: string;
  linkUrl: string;

  ipAddress?: string | null;
  userAgent?: string | null;
  browser?: string | null;
  os?: string | null;
  device?: string | null;
  referrer?: string | null;

  clickedAt: Date;

  createdAt?: Date;
  updatedAt?: Date;
}
