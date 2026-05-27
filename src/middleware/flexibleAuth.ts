import type { NextFunction, Request, Response } from "express";
import { auth } from "./auth.js";
import apiKeyAuth from "./apiKeyAuth.js";

const flexibleAuth = (req: Request, res: Response, next: NextFunction) => {
  const authorization = req.headers.authorization;
  const apiKey = req.headers["x-api-key"];

  if (authorization?.startsWith("Bearer ")) {
    return auth("user", "admin")(req, res, next);
  }

  if (apiKey) {
    return apiKeyAuth(req, res, next);
  }

  return auth("user", "admin")(req, res, next);
};

export default flexibleAuth;
