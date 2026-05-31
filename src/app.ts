import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";
import cors from "cors";
import config from "./config/index.js";
import morgan from "morgan";
import { notFound } from "./middleware/notFound.js";
import { globalErrorHandler } from "./middleware/globalErrorHandler.js";
import { LinkRoutes } from "./modules/link/link.route.js";
import { LinkControllers } from "./modules/link/link.controller.js";
import { AnalyticsRoutes } from "./modules/analytics/analytics.route.js";
import { CampaignRoutes } from "./modules/campaign/campaign.route.js";
import { PageRoutes } from "./modules/page/page.route.js";
import { DomainRoutes } from "./modules/domain/domain.route.js";
import { ApiKeyRoutes } from "./modules/apiKey/apiKey.route.js";
import {
  authLimiter,
  globalApiLimiter,
  redirectLimiter,
} from "./middleware/rateLimit.js";
import { toNodeHandler } from "better-auth/node";
import { betterAuthInstance } from "./modules/auth/better-auth.js";
import { UserRoutes } from "./modules/user/user.route.js";
import { BillingControllers } from "./modules/billing/billing.controller.js";
import { BillingRoutes } from "./modules/billing/billing.route.js";
import { NotificationRoutes } from "./modules/notification/notification.route.js";

const app: Application = express();

app.set("trust proxy", config.trust_proxy_hops);

app.use(helmet());
app.use(
  cors({
    origin: config.frontend_url,
    credentials: true,
  }),
);

app.use("/api/auth/sign-in/email", authLimiter);
app.use("/api/auth/sign-up/email", authLimiter);
app.all("/api/auth/*splat", toNodeHandler(betterAuthInstance));

app.post(
  "/api/billing/webhook",
  express.raw({ type: "application/json" }),
  BillingControllers.handleStripeWebhook,
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (config.node_env === "development") {
  app.use(morgan("dev"));
}

app.get("/", (req: Request, res: Response) => {
  res.send("Smart Link API is running;");
});

app.use("/api", globalApiLimiter);
app.use("/api/links", LinkRoutes);
app.use("/api/analytics", AnalyticsRoutes);
app.use("/api/campaigns", CampaignRoutes);
app.use("/api/pages", PageRoutes);
app.use("/api/domains", DomainRoutes);
app.use("/api/api-keys", ApiKeyRoutes);
app.use("/api/users", UserRoutes);
app.use("/api/billing", BillingRoutes);
app.use("/api/notifications", NotificationRoutes);

app.get("/:shortCode", redirectLimiter, LinkControllers.redirectLink);

app.use(notFound);
app.use(globalErrorHandler);

export default app;
