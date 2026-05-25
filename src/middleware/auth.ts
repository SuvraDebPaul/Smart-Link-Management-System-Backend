import type { NextFunction, Request, Response } from "express";
import AppError from "../errors/AppError.js";
import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../config/index.js";
import { decode } from "node:punycode";

export interface TAuthUser {
  id: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: TAuthUser;
    }
  }
}

export const auth = (...requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization;
    if (!token) {
      throw new AppError(401, "You are not authorized");
    }

    const decoded = jwt.verify(token, config.jwt_access_secret) as JwtPayload &
      TAuthUser;

    if (requiredRoles.length && !requiredRoles.includes(decoded.role)) {
      throw new AppError(403, "You are forbiden");
    }
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  };
};
