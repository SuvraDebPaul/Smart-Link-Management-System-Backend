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
import { AuthRoutes } from "./modules/auth/auth.route.js";
import { LinkRoutes } from "./modules/link/link.route.js";
import { LinkControllers } from "./modules/link/link.controller.js";
import { AnalyticsRoutes } from "./modules/analytics/analytics.route.js";
import { CampaignRoutes } from "./modules/campaign/campaign.route.js";
import { PageRoutes } from "./modules/page/page.route.js";
import { validateRequest } from "./middleware/validateRequest.js";
import { PageValidations } from "./modules/page/page.validation.js";
import { PageControllers } from "./modules/page/page.controller.js";
import { DomainRoutes } from "./modules/domain/domain.route.js";

const app: Application = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (config.node_env === "development") {
  app.use(morgan("dev"));
}

app.get("/", (req: Request, res: Response) => {
  res.send("Smart Link API is running;");
});
app.use("/api/auth", AuthRoutes);
app.use("/api/links", LinkRoutes);
app.use("/api/analytics", AnalyticsRoutes);
app.use("/api/campaigns", CampaignRoutes);
app.use("/api/pages", PageRoutes);
app.use("/api/domains", DomainRoutes);

app.get(
  "/u/:slug/click/:linkIndex",
  validateRequest(PageValidations.publicPageLinkClickValidationSchema),
  PageControllers.redirectPublicPageLink,
);

app.get(
  "/u/:slug",
  validateRequest(PageValidations.publicPageValidationSchema),
  PageControllers.getPublicPage,
);

app.get("/:shortCode", LinkControllers.redirectLink);

app.use(notFound);
app.use(globalErrorHandler);

export default app;
