import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { HttpError } from "@repo/types";
import type { NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";

interface ResetPasswordJwtContext {
  entity_id: string;
  provider: string;
  actor_type: string;
  iat?: number;
  exp?: number;
}

export const medusaAuthBlocker: RequestHandler = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: NextFunction,
) => {
  // special case for Medusa auth default authentication route
  const medusaAuthPattern = /^\/auth\/([^/]+)\/([^/]+)\/?$/;
  if (medusaAuthPattern.test(req.originalUrl)) {
    /* allow user authentication routes, otherwise admin dashboard auth will be blocked */
    if (req.originalUrl === "/auth/user/emailpass") {
      return next();
    }
    /* block this API route to exposing token in response body */
    throw new HttpError(
      "AUTH.FORBIDDEN",
      "This route has been disabled for security reasons as it exposes tokens in the response body. Use 'POST /auth/sign-in/:actor_type/:auth_provider' instead.",
    );
  }
  // special case for customer reset password endpoint
  if (/^\/auth\/customer\/([^/]+)\/update$/.test(req.originalUrl)) {
    if (!process.env.JWT_SECRET) {
      throw new HttpError("SYSTEM.MISCONFIGURED", "JWT_SECRET is not set");
    }
    const { email, password } = req.body as {
      email: string;
      password: string;
    };
    const [tokenType, tokenValue] = req.headers.authorization?.split(" ") || [];
    if (!tokenValue) {
      throw new HttpError("AUTH.UNAUTHORIZED", "Missing reset password token");
    }
    const payload = jwt.verify(
      tokenValue,
      process.env.JWT_SECRET,
    ) as ResetPasswordJwtContext;
    if (!payload) {
      throw new HttpError("AUTH.UNAUTHORIZED", "Invalid reset password token");
    }
    if (payload.actor_type !== "customer") {
      throw new HttpError("AUTH.ACTOR_TYPE_MISMATCH");
    }
    if (payload.entity_id !== email) {
      throw new HttpError(
        "AUTH.AUTH_IDENTITY_ID_MISSING",
        "Email does not match",
      );
    }
    if (payload.provider !== "emailpass") {
      throw new HttpError(
        "AUTH.AUTH_PROVIDER_MISMATCH",
        "Provider does not match",
      );
    }
    return next();
  }
  next();
};
