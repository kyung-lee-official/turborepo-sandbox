import type { ResourcePolicyDefinition } from "../types.js";

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
