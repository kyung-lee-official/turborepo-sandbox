import type { ResourcePolicyDefinition } from "@kyung.lee/authz";

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
