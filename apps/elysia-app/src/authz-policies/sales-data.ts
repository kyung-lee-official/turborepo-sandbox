import type { ResourcePolicyDefinition } from "@repo/authz";

export const salesDataPolicy: ResourcePolicyDefinition = {
  resource: "internal:applications:retail:sales-data",
  rules: [
    {
      name: "can-perform-operations-to-sales-data",
      actions: ["*"],
      effect: "EFFECT_ALLOW",
      roles: ["admin", "retail-manager", "retail-logistics"],
    },
  ],
};
