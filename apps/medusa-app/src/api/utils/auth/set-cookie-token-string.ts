import { HttpError } from "@repo/types";
import ms from "ms";

export const setCookieTokenString = (token: string) => {
  if (!process.env.JWT_EXPIRES_IN) {
    throw new HttpError("SYSTEM.MISCONFIGURED", "JWT_EXPIRES_IN is not set");
  }
  return `medusa_token=${token}; HttpOnly; Secure; Path=/; Max-Age=${ms(process.env.JWT_EXPIRES_IN as ms.StringValue) / 1000 || 3600}; SameSite=None; Domain=${process.env.COOKIE_DOMAIN}`;
};
