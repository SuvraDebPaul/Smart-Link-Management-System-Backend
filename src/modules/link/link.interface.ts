import type { Types } from "mongoose";

export interface ILink {
  userId?: Types.ObjectId | null;
  isGuest: boolean;
  campaignId?: Types.ObjectId | null;
  domainId?: Types.ObjectId | null;

  originalUrl: string;
  shortCode: string;
  tags: string[];
  folder?: string | null;
  notes?: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  clicks: number;
  isActive: boolean;

  isPasswordProtected: boolean;
  passwordHash?: string | null;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  maxClicks?: number | null;
  healthStatus: "unchecked" | "healthy" | "broken";
  healthStatusCode?: number | null;
  healthCheckedAt?: Date | null;
  conversionToken: string;

  createdAt: Date;
  updatedAt: Date;
}
