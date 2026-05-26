import type { Types } from "mongoose";

export interface IClickEvent {
  linkId: Types.ObjectId;
  userId: Types.ObjectId;
  shortCode: string;

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
