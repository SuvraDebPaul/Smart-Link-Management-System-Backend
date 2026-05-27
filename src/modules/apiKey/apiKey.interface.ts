import { Types } from "mongoose";

export interface IApiKey {
  user: Types.ObjectId;
  name: string;
  keyHash: string;
  keyPrefix: string;
  lastUsedAt?: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
