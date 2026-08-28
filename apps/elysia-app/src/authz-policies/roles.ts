import type { ResourcePolicyDefinition } from "@kyung.lee/authz";

export const rolesPolicy: ResourcePolicyDefinition = {
  resource: "internal:roles",
  rules: [
    {
      name: "admin-can-manage-roles",
      actions: ["*"],
      effect: "EFFECT_ALLOW",
      roles: ["admin"],
    },
    {
      name: "anyone-can-read-roles",
      actions: ["read"],
      effect: "EFFECT_ALLOW",
      roles: ["*"],
    },
  ],
};
