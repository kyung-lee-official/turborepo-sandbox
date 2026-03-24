import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  generateJwtToken,
} from "@medusajs/framework/utils";
import { HttpError, type JwtContext } from "@repo/types";
import type { NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { setCookieTokenString } from "../auth/set-cookie-token-string";

interface CookieData {
  medusa_token?: string;
}

type Requester = {
  id: string;
  actor_id: string;
  actor_type: "user" | "customer";
  auth_identity_id: string;
};

export type MedusaRequestWithRequester = MedusaRequest & {
  requester?: Requester;
};

/**
 * An alternative to the built-in `authenticate` middleware that uses JWT tokens stored in cookies
 * @param actorType the `actor_type` to authenticate, can be a string
 * @param authType the authentication type, currently only "bearer" is supported
 */
export const authenticateJwt = (
  actorType: string | string[],
  authType: "bearer" | ["bearer"] = "bearer",
): RequestHandler => {
  const authenticateMiddleware = async (
    req: MedusaRequestWithRequester,
    res: MedusaResponse,
    next: NextFunction,
  ): Promise<void> => {
    // const authTypes = Array.isArray(authType) ? authType : [authType];
    const actorTypes = Array.isArray(actorType) ? actorType : [actorType];

    if (!process.env.JWT_SECRET) {
      throw new HttpError("SYSTEM.MISCONFIGURED", "JWT_SECRET is not set");
    }

    // special case for customer registration endpoint
    if (/^\/store\/customers$/.test(req.originalUrl) && req.method === "POST") {
      const [tokenType, tokenValue] =
        req.headers.authorization?.split(" ") || [];
      if (!tokenValue) {
        throw new HttpError("AUTH.UNAUTHORIZED", "Missing registration token");
      }
      const payload = jwt.verify(
        tokenValue,
        process.env.JWT_SECRET,
      ) as JwtContext;
      if (!payload) {
        throw new HttpError("AUTH.UNAUTHORIZED", "Invalid registration token");
      }
      // if only the registration token is generated, but customer not registered yet, token will not include an actor_id,
      // so we only check for actor_type here
      if (payload.actor_type !== "customer") {
        throw new HttpError("AUTH.ACTOR_TYPE_MISMATCH");
      }
      return next();
    }

    const { medusa_token } = req.cookies as CookieData;
    const token = medusa_token;
    if (!token) {
      throw new HttpError("AUTH.UNAUTHORIZED");
    }
    // try to extract the auth context from a JWT token
    const jwtAuthContext = jwt.decode(token || "", {
      json: true,
    }) as JwtContext | null;

    if (!jwtAuthContext) {
      throw new HttpError("AUTH.UNAUTHORIZED");
    }

    // We also don't want to allow creating eg. a customer with a token created for a `user` provider.
    if (
      !jwtAuthContext.actor_type ||
      !isActorTypePermitted(actorTypes, jwtAuthContext.actor_type)
    ) {
      throw new HttpError("AUTH.ACTOR_TYPE_MISMATCH");
    }

    if (!jwtAuthContext.auth_identity_id) {
      throw new HttpError(
        "AUTH.AUTH_IDENTITY_ID_MISSING",
        "auth_identity_id is missing in the token payload",
      );
    }

    if (jwtAuthContext.exp && Date.now() >= jwtAuthContext.exp * 1000) {
      throw new HttpError("AUTH.JWT_EXPIRED");
    }

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        // If JWT_SECRET is not set, token validation will fail
        throw new HttpError("AUTH.INVALID_TOKEN", "JWT_SECRET is not set");
      }
      const payload = jwt.verify(token, secret) as JwtContext;
      if (!payload) {
        throw new HttpError("AUTH.INVALID_TOKEN", "Token verification failed");
      }
      req.requester = getRequesterFromPayload(payload);
    } catch (error) {
      throw new HttpError("AUTH.INVALID_TOKEN");
    }

    const { http } = req.scope.resolve(
      ContainerRegistrationKeys.CONFIG_MODULE,
    ).projectConfig;

    // refresh token if it's close to expiration (within 1 hour)
    const oneHourInSeconds = 3600;
    if (
      jwtAuthContext.exp &&
      jwtAuthContext.exp - Date.now() / 1000 < oneHourInSeconds
    ) {
      const newToken = generateJwtToken(
        {
          actor_id: jwtAuthContext.actor_id,
          actor_type: jwtAuthContext.actor_type,
          auth_identity_id: jwtAuthContext.auth_identity_id,
          app_metadata: jwtAuthContext.app_metadata,
          user_metadata: jwtAuthContext.user_metadata,
        },
        {
          secret: http.jwtSecret,
          expiresIn: http.jwtExpiresIn,
        },
      );
      res.setHeader("Set-Cookie", [setCookieTokenString(newToken)]);
    }

    // set the authorization header for downstream medusa built-in 'authenticate' middleware
    req.headers.authorization = `Bearer ${token}`;

    return next();
  };

  return authenticateMiddleware as unknown as RequestHandler;
};

const isActorTypePermitted = (
  actorTypes: string | string[],
  currentActorType: string,
) => {
  return actorTypes.includes("*") || actorTypes.includes(currentActorType);
};

const getRequesterFromPayload = (payload: JwtContext): Requester => {
  if (!payload.auth_identity_id) {
    throw new HttpError(
      "AUTH.AUTH_IDENTITY_ID_MISSING",
      "auth_identity_id is missing in the token payload",
    );
  }
  switch (payload.actor_type) {
    case "user":
      if (!payload.app_metadata || !payload.app_metadata.user_id) {
        throw new HttpError(
          "AUTH.INVALID_TOKEN",
          "user_id is missing in app_metadata",
        );
      }
      return {
        id: payload.app_metadata.user_id as string,
        actor_id: payload.actor_id as string,
        actor_type: "user",
        auth_identity_id: payload.auth_identity_id as string,
      };
    case "customer":
      if (!payload.app_metadata || !payload.app_metadata.customer_id) {
        throw new HttpError(
          "AUTH.INVALID_TOKEN",
          "customer_id is missing in user_metadata",
        );
      }
      return {
        id: payload.app_metadata.customer_id as string,
        actor_id: payload.actor_id as string,
        actor_type: "customer",
        auth_identity_id: payload.auth_identity_id as string,
      };
    default:
      throw new HttpError(
        "AUTH.INVALID_TOKEN",
        `Unsupported actor_type: ${payload.actor_type}`,
      );
  }
};
