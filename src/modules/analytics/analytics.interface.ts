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

export type TTopLinkAnalytics = {
  linkId: string;
  originalUrl: string;
  shortCode: string;
  isActive: boolean;
  clicks: number;
};

export type TTopCampaignAnalytics = {
  campaignId: string;
  name: string;
  status: "active" | "paused" | "completed";
  clicks: number;
};

export type TTopPageAnalytics = {
  pageId: string;
  title: string;
  slug: string;
  visits: number;
  linkClicks: number;
};

export type TOverviewDailyActivity = {
  date: string;
  clicks: number;
  visits: number;
};

export type TOverviewDevice = {
  device: string;
  total: number;
};

export type TOverviewBrowser = {
  browser: string;
  total: number;
};

export type TOverviewReferrer = {
  referrer: string;
  total: number;
};

export type TAnalyticsOverview = {
  totalLinks: number;
  totalClicks: number;
  activeLinks: number;
  inactiveLinks: number;

  totalCampaigns: number;
  totalPages: number;
  totalPageVisits: number;
  totalPageLinkClicks: number;
  uniqueVisitors: number;

  bioPageCtr: number;
  conversionRate: number;

  dailyActivity: TOverviewDailyActivity[];

  topLinks: TTopLinkAnalytics[];
  topCampaigns: TTopCampaignAnalytics[];
  topPages: TTopPageAnalytics[];

  devices: TOverviewDevice[];
  browsers: TOverviewBrowser[];
  referrers: TOverviewReferrer[];
};
