import { principalAttrIdEqualsResourceAttrId } from "../helpers.js";
import type { ResourcePolicyDefinition } from "../types.js";

export const authenticationPolicy: ResourcePolicyDefinition = {
  resource: "internal:authentication",
  rules: [
    {
      name: "admin-can-change-anyones-password",
      actions: ["update-password"],
      effect: "EFFECT_ALLOW",
      roles: ["admin"],
    },
    {
      name: "can-only-change-own-password",
      actions: ["update-password"],
      effect: "EFFECT_ALLOW",
      roles: ["*"],
      when: principalAttrIdEqualsResourceAttrId,
    },
  ],
};
