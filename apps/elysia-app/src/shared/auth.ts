import { AuthzClient } from "@kyung.lee/authz";
import { status } from "elysia";
import { jwtVerify } from "jose";
import { POLICY_REGISTRY } from "../authz-policies/index.ts";
import { getPrisma } from "./db.ts";

/** Shared in-process Authz PDP (replaces Cerbos). */
export const authz = new AuthzClient(POLICY_REGISTRY);

const SECRET = process.env.SECRET ?? "";
const secretKey = new TextEncoder().encode(SECRET);

async function verifyJwt(token: string): Promise<{ id: string }> {
  if (!SECRET) throw status(500, { error: "Missing SECRET env var." });
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (typeof payload.id !== "string" || !payload.id) {
      throw status(401, { error: "Invalid token payload." });
    }
    return { id: payload.id };
  } catch (err) {
    if (err && typeof err === "object" && "status" in err) throw err;
    throw status(401, { error: "Invalid token." });
  }
}

/** Build an Authz Principal from a member row (with roles). */
function principalFromMember(member: { id: string; roles: { id: string }[] }) {
  return {
    id: member.id,
    roles: member.roles.map((r) => r.id),
  };
}

/** Resolve a user + Authz principal from `Authorization: Bearer <jwt>`. */
export async function resolveUserFromHeaders(
  headers: Record<string, string | undefined>,
) {
  const auth = headers.authorization ?? headers.Authorization;
  if (!auth) return null;
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { id } = await verifyJwt(token);
  const member = await getPrisma().member.findUnique({
    where: { id },
    include: { roles: true },
  });
  if (!member) return null;
  return {
    user: { id: member.id, roles: member.roles },
    principal: principalFromMember(member),
  };
}

/** Throw 401 when no resolved user. */
export function unauthorized() {
  return status(401, { error: "Unauthorized" });
}

/** Throw 403 when user is not an admin. */
export function forbidden() {
  return status(403, { error: "Forbidden" });
}

/**
 * Evaluate `(principal, action)` against the resource policy for `kind`.
 * `resourceId` defaults to `principal.id`; pass the target's id for delete/update on a specific resource.
 * `resourceAttr` is forwarded to the policy context (e.g. `{ memberRoles: [...] }` for `cannot-delete-admin-members`).
 */
export async function isActionAllowed(
  principal: { id: string; roles: string[] },
  kind: string,
  action: string,
  resourceId?: string,
  resourceAttr?: Record<string, unknown>,
): Promise<boolean> {
  const decision = await authz.checkResource({
    principal,
    resource: {
      kind,
      id: resourceId ?? principal.id,
      attr: resourceAttr,
    },
    actions: [action],
  });
  return decision.isAllowed(action);
}
