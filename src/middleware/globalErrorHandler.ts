import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import config from "../config/index.js";

type TErrorSource = {
  path?: string;
  message?: string;
};

const handleZodError = (error: ZodError) => {
  const errorSources: TErrorSource[] = error.issues.map((issue) => {
    return {
      path: issue.path.join("."),
      message: issue.message,
    };
  });

  return {
    statusCode: 400,
    message: "Validation failed",
    errorSources,
  };
};

const handleDuplicateError = (error: any) => {
  const field = Object.keys(error.keyValue || {})[0] || "field";
  const value = error.keyValue?.[field] || "value";

  return {
    statusCode: 409,
    message: `${field} "${value}" already exists`,
    errorSources: [
      {
        path: field,
        message: `${field} must be unique`,
      },
    ],
  };
};

const handleCastError = (error: any) => {
  return {
    statusCode: 400,
    message: "Invalid ID",
    errorSources: [
      {
        path: error.path || "id",
        message: `${error.value || "provided value"} is not a valid ID`,
      },
    ],
  };
};

const handleJsonWebTokenError = () => {
  return {
    statusCode: 401,
    message: "Invalid token",
    errorSources: [
      {
        path: "authorization",
        message: "The provided token is invalid",
      },
    ],
  };
};

const handleTokenExpiredError = () => {
  return {
    statusCode: 401,
    message: "Token expired",
    errorSources: [
      {
        path: "authorization",
        message: "Please login again",
      },
    ],
  };
};

export const globalErrorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  next,
) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Something went wrong";
  let errorSources: TErrorSource[] = [
    {
      path: "",
      message,
    },
  ];

  if (error instanceof ZodError) {
    const simplifiedError = handleZodError(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = simplifiedError.errorSources;
  } else if (error.code === 11000) {
    const simplifiedError = handleDuplicateError(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = simplifiedError.errorSources;
  } else if (error.name === "CastError") {
    const simplifiedError = handleCastError(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = simplifiedError.errorSources;
  } else if (error.name === "JsonWebTokenError") {
    const simplifiedError = handleJsonWebTokenError();
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = simplifiedError.errorSources;
  } else if (error.name === "TokenExpiredError") {
    const simplifiedError = handleTokenExpiredError();
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = simplifiedError.errorSources;
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    error: config.node_env === "development" ? error : undefined,
    stack: config.node_env === "development" ? error.stack : undefined,
  });
};
