import type { ResourcePolicyDefinition } from "@repo/authz";

export const serverSettingsPolicy: ResourcePolicyDefinition = {
  resource: "internal:server-settings",
  rules: [
    {
      actions: ["*"],
      effect: "EFFECT_ALLOW",
      roles: ["admin"],
    },
  ],
};
