import type { ErrorRequestHandler } from "express";
import config from "../config/index.js";

export const globalErrorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  next,
) => {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || "Something went wrong",
    error: config.node_env === "development" ? error : undefined,
    stack: config.node_env === "development" ? error.stack : undefined,
  });
};
