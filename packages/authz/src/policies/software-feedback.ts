import type { ResourcePolicyDefinition } from "../types.js";

export const softwareFeedbackPolicy: ResourcePolicyDefinition = {
  resource: "internal:applications:chitubox-dental:software-feedback",
  rules: [
    {
      name: "software-feedback",
      actions: ["*"],
      effect: "EFFECT_ALLOW",
      roles: ["admin", "branding-manager", "branding"],
    },
  ],
};
