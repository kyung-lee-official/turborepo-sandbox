/**
 * Official `methods` values for Hosted Checkout per Ocean payment products list.
 * @see https://dev.oceanpayment.com/en/docs/payment/methods/list
 *
 * Keep in sync with:
 * `apps/next-app/src/app/medusa/store-api/payment/ocean-hosted-methods.ts`
 */
export const OCEAN_HOSTED_CHECKOUT_METHODS = {
  CREDIT_CARD: "Credit Card",
  APPLE_PAY: "ApplePay",
  GOOGLE_PAY: "GooglePay",
} as const;

export type OceanHostedCheckoutMethod =
  (typeof OCEAN_HOSTED_CHECKOUT_METHODS)[keyof typeof OCEAN_HOSTED_CHECKOUT_METHODS];

export const OCEAN_HOSTED_CHECKOUT_METHOD_VALUES: OceanHostedCheckoutMethod[] =
  Object.values(OCEAN_HOSTED_CHECKOUT_METHODS);

export function isAllowedOceanHostedCheckoutMethod(value: string): boolean {
  return OCEAN_HOSTED_CHECKOUT_METHOD_VALUES.includes(
    value as OceanHostedCheckoutMethod,
  );
}
