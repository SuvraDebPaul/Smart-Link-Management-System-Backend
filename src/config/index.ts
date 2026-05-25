import dotenv from "dotenv";

dotenv.config();

const config = {
  node_env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  database_url: process.env.DATABASE_URL as string,
  jwt_access_secret: process.env.JWT_ACCESS_SECRET as string,
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN || "7d",
  base_url: process.env.BASE_URL || "http://localhost:5000",
  base_api: process.env.BASE_API || "http://localhost:5000/api/v1",
};

export default config;
