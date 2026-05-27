import crypto from "crypto";

const API_KEY_PREFIX = "sk_live";

export const generateApiKey = () => {
  const randomKey = crypto.randomBytes(32).toString("hex");

  const apiKey = `${API_KEY_PREFIX}_${randomKey}`;

  const keyPrefix = apiKey.slice(0, 16);

  return {
    apiKey,
    keyPrefix,
  };
};

export const hashApiKey = (apiKey: string) => {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
};
