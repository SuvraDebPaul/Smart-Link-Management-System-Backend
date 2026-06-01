import { Types } from "mongoose";

export type TCampaignStatus = "active" | "paused" | "completed";
export type TUtmPreset = {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  term?: string | null;
  content?: string | null;
};

export interface ICampaign {
  userId: Types.ObjectId;
  name: string;
  description?: string | null;
  notes?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientCompany?: string | null;
  status: TCampaignStatus;
  isArchived: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
  goalClicks?: number | null;
  tags: string[];
  budget?: number | null;
  conversions: number;
  revenue?: number | null;
  primaryUrl?: string | null;
  isTemplate: boolean;
  shareEnabled: boolean;
  shareToken?: string | null;
  utmPreset: TUtmPreset;
  reportFrequency: "none" | "daily" | "weekly";
  lastReportAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}
