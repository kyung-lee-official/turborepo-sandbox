import { Elysia } from "elysia";
import {
  forbidden,
  resolveUserFromHeaders,
  unauthorized,
} from "../../shared/auth.ts";

/** Request-scoped auth macros — explicit `.use(auth)` on modules that need them. */
export const auth = new Elysia({ name: "Auth.Service" }).macro({
  requireUser: {
    async resolve({ headers }) {
      const resolved = await resolveUserFromHeaders(headers);
      if (!resolved) return unauthorized();
      return { user: resolved.user, principal: resolved.principal };
    },
  },
  requireAdmin: {
    async resolve({ headers }) {
      const resolved = await resolveUserFromHeaders(headers);
      if (!resolved) return unauthorized();
      if (!resolved.principal.roles.includes("admin")) return forbidden();
      return { user: resolved.user, principal: resolved.principal };
    },
  },
});
