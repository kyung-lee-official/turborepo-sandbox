export type Effect = "EFFECT_ALLOW" | "EFFECT_DENY";

export type PolicyRuleEffect = Effect;

export interface PolicyContext {
  principal: {
    id: string;
    roles: string[];
    attr?: Record<string, unknown>;
  };
  resource: {
    kind: string;
    id?: string;
    attr?: Record<string, unknown>;
  };
}

export interface PolicyRule {
  name?: string;
  actions: string[];
  effect: PolicyRuleEffect;
  roles: string[];
  when?: (ctx: PolicyContext) => boolean;
}

export interface ResourcePolicyDefinition {
  resource: string;
  rules: PolicyRule[];
}

/** Map of resource kind → its policy definition. Pass an instance to `AuthzClient`. */
export type PolicyRegistry = Record<string, ResourcePolicyDefinition>;
