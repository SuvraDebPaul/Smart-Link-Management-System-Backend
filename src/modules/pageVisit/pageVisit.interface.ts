import { Types } from "mongoose";

export interface IPageVisit {
  pageId: Types.ObjectId;
  userId: Types.ObjectId;
  slug: string;

  ipAddress?: string | null;
  userAgent?: string | null;
  browser?: string | null;
  os?: string | null;
  device?: string | null;
  referrer?: string | null;

  visitedAt: Date;

  createdAt?: Date;
  updatedAt?: Date;
}
