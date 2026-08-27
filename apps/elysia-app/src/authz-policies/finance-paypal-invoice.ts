import type { ResourcePolicyDefinition } from "@repo/authz";

export const financePaypalInvoicePolicy: ResourcePolicyDefinition = {
  resource: "internal:applications:finance:paypal-invoice",
  rules: [
    {
      name: "can-perform-operations-on-finance-paypal-invoice",
      actions: ["*"],
      effect: "EFFECT_ALLOW",
      roles: ["finance"],
    },
  ],
};
