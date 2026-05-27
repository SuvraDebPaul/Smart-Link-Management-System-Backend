import { Types } from "mongoose";
import { generateApiKey, hashApiKey } from "./apiKey.utils.js";
import { ApiKey } from "./apiKey.model.js";
import AppError from "../../errors/AppError.js";

const createApiKeyIntoDB = async (userId: string, name: string) => {
  const { apiKey, keyPrefix } = generateApiKey();

  const keyHash = hashApiKey(apiKey);

  const result = await ApiKey.create({
    user: new Types.ObjectId(userId),
    name,
    keyHash,
    keyPrefix,
  });

  return {
    id: result._id,
    name: result.name,
    key: apiKey,
    keyPrefix: result.keyPrefix,
    isActive: result.isActive,
    createdAt: result.createdAt,
  };
};

const getMyApiKeysFromDB = async (userId: string) => {
  const result = await ApiKey.find({
    user: userId,
  })
    .select("name keyPrefix lastUsedAt isActive createdAt updatedAt")
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
  ).select("name keyPrefix isActive lastUsedAt createdAt updatedAt");

  if (!result) {
    throw new AppError(404, "API key not found or already revoked");
  }

  return result;
};

export const ApiKeyServices = {
  createApiKeyIntoDB,
  getMyApiKeysFromDB,
  revokeApiKeyFromDB,
};
