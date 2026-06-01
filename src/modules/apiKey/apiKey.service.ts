import { Types } from "mongoose";
import { generateApiKey, hashApiKey } from "./apiKey.utils.js";
import { ApiKey } from "./apiKey.model.js";
import AppError from "../../errors/AppError.js";
import type { TAuthUser } from "../user/user.interface.js";
import { checkPlanLimit } from "../../utils/checkPlanLimit.js";
import { User } from "../user/user.model.js";

export const getAvailableApiKeyFilter = () => ({
  isActive: true,
  $or: [
    { expiresAt: null },
    { expiresAt: { $exists: false } },
    { expiresAt: { $gt: new Date() } },
  ],
});

const createApiKeyIntoDB = async (
  userPayload: TAuthUser,
  name: string,
  expiryDays?: number | null,
) => {
  const userObjectId = new Types.ObjectId(userPayload.id);
  const totalApiKeys = await ApiKey.countDocuments({
    user: userObjectId,
    ...getAvailableApiKeyFilter(),
  });
  checkPlanLimit({
    plan: userPayload.plan,
    subscriptionStatus: userPayload.subscriptionStatus,
    key: "apiKeys",
    currentUsage: totalApiKeys,
  });
  const { apiKey, keyPrefix } = generateApiKey();
  const keyHash = hashApiKey(apiKey);
  const user = await User.findById(userObjectId).select(
    "apiSecurityPreferences.defaultApiKeyExpiryDays",
  );
  const resolvedExpiryDays =
    expiryDays === undefined
      ? user?.apiSecurityPreferences?.defaultApiKeyExpiryDays
      : expiryDays;
  const expiresAt = resolvedExpiryDays
    ? new Date(Date.now() + resolvedExpiryDays * 24 * 60 * 60 * 1000)
    : null;
  const result = await ApiKey.create({
    user: userObjectId,
    name,
    keyHash,
    keyPrefix,
    expiresAt,
  });

  return {
    id: result._id,
    name: result.name,
    key: apiKey,
    keyPrefix: result.keyPrefix,
    isActive: result.isActive,
    expiresAt: result.expiresAt,
    createdAt: result.createdAt,
  };
};

const getMyApiKeysFromDB = async (userId: string) => {
  const result = await ApiKey.find({
    user: userId,
  })
    .select("name keyPrefix lastUsedAt expiresAt isActive createdAt updatedAt")
    .sort({
      createdAt: -1,
    });

  return result;
};

const revokeApiKeyFromDB = async (userId: string, apiKeyId: string) => {
  const result = await ApiKey.findOneAndUpdate(
    {
      _id: apiKeyId,
      user: userId,
      isActive: true,
    },
    {
      isActive: false,
    },
    {
      new: true,
    },
  ).select("name keyPrefix isActive lastUsedAt expiresAt createdAt updatedAt");

  if (!result) {
    throw new AppError(404, "API key not found or already revoked");
  }

  return result;
};

const rotateApiKeyIntoDB = async (userId: string, apiKeyId: string) => {
  const { apiKey, keyPrefix } = generateApiKey();
  const keyHash = hashApiKey(apiKey);
  const result = await ApiKey.findOneAndUpdate(
    {
      _id: apiKeyId,
      user: userId,
      isActive: true,
    },
    {
      keyHash,
      keyPrefix,
      lastUsedAt: null,
    },
    {
      new: true,
    },
  ).select("name keyPrefix isActive expiresAt createdAt updatedAt");

  if (!result) {
    throw new AppError(404, "API key not found or already revoked");
  }

  return {
    id: result._id,
    name: result.name,
    key: apiKey,
    keyPrefix: result.keyPrefix,
    isActive: result.isActive,
    expiresAt: result.expiresAt,
    createdAt: result.createdAt,
  };
};

export const ApiKeyServices = {
  createApiKeyIntoDB,
  getMyApiKeysFromDB,
  revokeApiKeyFromDB,
  rotateApiKeyIntoDB,
};
