import {
  principalAttrIdEqualsResourceAttrId,
  resourceAttrIncludes,
} from "../helpers.js";
import type { ResourcePolicyDefinition } from "../types.js";

export const membersPolicy: ResourcePolicyDefinition = {
  resource: "internal:members",
  rules: [
    {
      actions: ["*"],
      effect: "EFFECT_ALLOW",
      roles: ["admin"],
    },
    {
      name: "cannot-delete-admin-members",
      actions: ["delete"],
      effect: "EFFECT_DENY",
      roles: ["*"],
      when: (ctx) => resourceAttrIncludes(ctx, "memberRoles", "admin"),
    },
    {
      name: "read-members",
      actions: ["read"],
      effect: "EFFECT_ALLOW",
      roles: ["*"],
    },
    {
      name: "read-my-private-info",
      actions: ["read-my-private-info"],
      effect: "EFFECT_ALLOW",
      roles: ["*"],
      when: principalAttrIdEqualsResourceAttrId,
    },
    {
      actions: ["update-profile"],
      effect: "EFFECT_ALLOW",
      roles: ["*"],
      when: principalAttrIdEqualsResourceAttrId,
    },
    {
      actions: ["freeze"],
      effect: "EFFECT_DENY",
      roles: ["*"],
      when: principalAttrIdEqualsResourceAttrId,
    },
  ],
};
