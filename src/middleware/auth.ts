import type { NextFunction, Request, Response } from "express";
import AppError from "../errors/AppError.js";
import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../config/index.js";

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
    const authorization = req.headers.authorization;
    if (!authorization) {
      throw new AppError(401, "You are not authorized");
    }

    const [bearer, token] = authorization.split(" ");
    if (bearer !== "Bearer" || !token) {
      throw new AppError(
        401,
        "Invalid authorization format. Use: Bearer your_token_here",
      );
    }
    const decoded = jwt.verify(token, config.jwt_access_secret) as JwtPayload &
      TAuthUser;

    if (!decoded.id || !decoded.email || !decoded.role) {
      throw new AppError(401, "Invalid token payload");
    }

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
