import type { Types } from "mongoose";

export interface ILink {
  userId?: Types.ObjectId | null;
  isGuest: boolean;
  campaignId?: Types.ObjectId | null;
  domainId?: Types.ObjectId | null;

  originalUrl: string;
  shortCode: string;
  clicks: number;
  isActive: boolean;

  isPasswordProtected: boolean;
  passwordHash?: string | null;
  expiresAt?: Date | null;
  maxClicks?: number | null;

  createdAt: Date;
  updatedAt: Date;
}
