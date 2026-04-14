/**
 * Official `methods` values for Hosted Checkout per Ocean payment products list.
 * @see https://dev.oceanpayment.com/en/docs/payment/methods/list
 *
 * Apple Pay and Google Pay: expect `sendTrade` / hosted checkout to work only when
 * those rails are enabled on your real Ocean merchant account and terminal.
 * Ocean sandbox / test environments often do not support wallet methods (you may see
 * declines such as payment method not accepted).
 *
 * Keep in sync with:
 * `apps/next-app/src/app/medusa/store-api/payment/ocean-hosted-methods.ts`
 *
 * Medusa provider id: `OCEANPAYMENT_MEDUSA_PAYMENT_PROVIDER_ID` in `config.ts`.
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
