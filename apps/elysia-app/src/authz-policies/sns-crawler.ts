import type { ResourcePolicyDefinition } from "@repo/authz";

export const snsCrawlerPolicy: ResourcePolicyDefinition = {
  resource: "internal:applications:retail:sns-crawler",
  rules: [
    {
      name: "can-perform-operations-to-sns-crawler",
      actions: ["*"],
      effect: "EFFECT_ALLOW",
      roles: ["admin", "retail-manager"],
    },
  ],
};
