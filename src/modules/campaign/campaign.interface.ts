import { Types } from "mongoose";

export type TCampaignStatus = "active" | "paused" | "completed";

export interface ICampaign {
  userId: Types.ObjectId;
  name: string;
  description?: string | null;
  status: TCampaignStatus;
  startDate?: Date | null;
  endDate?: Date | null;
  goalClicks?: number | null;

  createdAt?: Date;
  updatedAt?: Date;
}
