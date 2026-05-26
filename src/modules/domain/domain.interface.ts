import { Types } from "mongoose";

export type TDomainStatus = "pending" | "verified" | "failed";

export interface IDomain {
  userId: Types.ObjectId;
  domain: string;
  status: TDomainStatus;
  verificationToken: string;
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}
