import type { PolicyContext } from "./types.js";

export function principalAttrIdEqualsResourceAttrId(
  ctx: PolicyContext,
): boolean {
  return ctx.principal.attr?.id === ctx.resource.attr?.id;
}

export function principalIdEqualsResourceAttr(
  ctx: PolicyContext,
  resourceAttrField: string,
): boolean {
  return ctx.principal.id === ctx.resource.attr?.[resourceAttrField];
}

export function principalRolesExistInResourceAttr(
  ctx: PolicyContext,
  resourceAttrField: string,
): boolean {
  const targets = ctx.resource.attr?.[resourceAttrField];
  if (!Array.isArray(targets)) {
    return false;
  }
  return ctx.principal.roles.some((role) => targets.includes(role));
}

export function resourceAttrIncludes(
  ctx: PolicyContext,
  resourceAttrField: string,
  value: string,
): boolean {
  const values = ctx.resource.attr?.[resourceAttrField];
  return Array.isArray(values) && values.includes(value);
}

export function ownerRoleInPrincipalRoles(ctx: PolicyContext): boolean {
  const ownerRole = ctx.resource.attr?.ownerRole;
  return (
    typeof ownerRole === "string" && ctx.principal.roles.includes(ownerRole)
  );
}

export function principalIsStatOwner(ctx: PolicyContext): boolean {
  return principalIdEqualsResourceAttr(ctx, "statOwnerId");
}

export function statOwnerUpdatingNegativeScore(ctx: PolicyContext): boolean {
  const score = ctx.resource.attr?.score;
  return principalIsStatOwner(ctx) && typeof score === "number" && score < 0;
}
