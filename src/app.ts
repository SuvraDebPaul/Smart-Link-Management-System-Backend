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

app.get("/:shortCode", LinkControllers.redirectLink);

app.use(notFound);
app.use(globalErrorHandler);

export default app;
