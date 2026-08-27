import type {
  Effect,
  PolicyContext,
  PolicyRegistry,
  PolicyRule,
} from "./types.js";

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

/** Evaluate a single action against the policy registry. */
export function evaluateAction(
  registry: PolicyRegistry,
  resourceKind: string,
  action: string,
  ctx: PolicyContext,
): Effect {
  const policy = registry[resourceKind];
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

/** Evaluate many actions at once for the same resource kind + context. */
export function evaluateActions(
  registry: PolicyRegistry,
  resourceKind: string,
  actions: readonly string[],
  ctx: PolicyContext,
): Record<string, Effect> {
  const result: Record<string, Effect> = {};
  for (const action of actions) {
    result[action] = evaluateAction(registry, resourceKind, action, ctx);
  }
  return result;
}
