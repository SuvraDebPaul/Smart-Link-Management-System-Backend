import type { Types } from "mongoose";

export interface ILink {
  userId: Types.ObjectId;
  originalUrl: string;
  shortCode: string;
  clicks: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
