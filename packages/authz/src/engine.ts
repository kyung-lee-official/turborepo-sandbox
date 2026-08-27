import { POLICY_REGISTRY } from "./policies/index.js";
import type { Effect, PolicyContext, PolicyRule } from "./types.js";

function actionMatches(
  ruleActions: readonly string[],
  action: string,
): boolean {
  return ruleActions.includes("*") || ruleActions.includes(action);
}

function roleMatches(
  ruleRoles: readonly string[],
  principalRoles: readonly string[],
): boolean {
  if (ruleRoles.includes("*")) {
    return true;
  }
  return principalRoles.some((role) => ruleRoles.includes(role));
}

function ruleMatches(
  rule: PolicyRule,
  action: string,
  ctx: PolicyContext,
): boolean {
  if (!actionMatches(rule.actions, action)) {
    return false;
  }
  if (!roleMatches(rule.roles, ctx.principal.roles)) {
    return false;
  }
  if (rule.when && !rule.when(ctx)) {
    return false;
  }
  return true;
}

export function evaluateAction(
  resourceKind: string,
  action: string,
  ctx: PolicyContext,
): Effect {
  const policy = POLICY_REGISTRY[resourceKind];
  if (!policy) {
    return "EFFECT_DENY";
  }

  let hasAllow = false;

  for (const rule of policy.rules) {
    if (!ruleMatches(rule, action, ctx)) {
      continue;
    }
    if (rule.effect === "EFFECT_DENY") {
      return "EFFECT_DENY";
    }
    if (rule.effect === "EFFECT_ALLOW") {
      hasAllow = true;
    }
  }

  return hasAllow ? "EFFECT_ALLOW" : "EFFECT_DENY";
}

export function evaluateActions(
  resourceKind: string,
  actions: readonly string[],
  ctx: PolicyContext,
): Record<string, Effect> {
  const result: Record<string, Effect> = {};
  for (const action of actions) {
    result[action] = evaluateAction(resourceKind, action, ctx);
  }
  return result;
}
