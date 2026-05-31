import dotenv from "dotenv";

dotenv.config();

const config = {
  node_env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  trust_proxy_hops: Number(process.env.TRUST_PROXY_HOPS || 0),
  database_url: process.env.DATABASE_URL as string,

  base_url: process.env.BASE_URL || "http://localhost:5000",
  base_api: process.env.BASE_API || "http://localhost:5000/api/v1",

  frontend_url: process.env.FRONTEND_URL || "http://localhost:3000",

  better_auth_secret: process.env.BETTER_AUTH_SECRET,
  better_auth_url:
    process.env.BETTER_AUTH_URL ||
    process.env.BASE_URL ||
    "http://localhost:5000",

  google_client_id: process.env.GOOGLE_CLIENT_ID,
  google_client_secret: process.env.GOOGLE_CLIENT_SECRET,

  github_client_id: process.env.GITHUB_CLIENT_ID,
  github_client_secret: process.env.GITHUB_CLIENT_SECRET,

  stripe_secret_key: process.env.STRIPE_SECRET_KEY,
  stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
  stripe_starter_price_id: process.env.STRIPE_STARTER_PRICE_ID,
  stripe_pro_price_id: process.env.STRIPE_PRO_PRICE_ID,

  webhook_signing_secret: process.env.WEBHOOK_SIGNING_SECRET,

  resend_api_key: process.env.RESEND_API_KEY,
  email_from: process.env.EMAIL_FROM,
};

export default config;
