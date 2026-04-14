/**
 * Official `methods` values for Ocean Hosted Checkout (sendTrade).
 * @see https://dev.oceanpayment.com/en/docs/payment/methods/list
 *
 * Keep in sync with:
 * `apps/medusa-app/src/modules/ocean-payment/hosted-checkout-methods.ts`
 */
export const OCEAN_HOSTED_CHECKOUT_METHODS = {
  CREDIT_CARD: "Credit Card",
  APPLE_PAY: "ApplePay",
  GOOGLE_PAY: "GooglePay",
} as const;

export type OceanHostedCheckoutMethod =
  (typeof OCEAN_HOSTED_CHECKOUT_METHODS)[keyof typeof OCEAN_HOSTED_CHECKOUT_METHODS];

export const OCEAN_HOSTED_CHECKOUT_METHOD_OPTIONS: {
  value: OceanHostedCheckoutMethod;
  label: string;
}[] = [
  { value: OCEAN_HOSTED_CHECKOUT_METHODS.CREDIT_CARD, label: "Credit card" },
  { value: OCEAN_HOSTED_CHECKOUT_METHODS.APPLE_PAY, label: "Apple Pay" },
  { value: OCEAN_HOSTED_CHECKOUT_METHODS.GOOGLE_PAY, label: "Google Pay" },
];
