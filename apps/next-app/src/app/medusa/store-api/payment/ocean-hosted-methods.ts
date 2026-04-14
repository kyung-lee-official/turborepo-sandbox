/**
 * Official `methods` values for Ocean Hosted Checkout (sendTrade).
 * @see https://dev.oceanpayment.com/en/docs/payment/methods/list
 *
 * Apple Pay and Google Pay: expect `sendTrade` / hosted checkout to work only when
 * those rails are enabled on your real Ocean merchant account and terminal.
 * Ocean sandbox / test environments often do not support wallet methods (you may see
 * declines such as payment method not accepted).
 *
 * Keep in sync with:
 * `apps/medusa-app/src/modules/ocean-payment/hosted-checkout-methods.ts`
 *
 * Medusa provider id: align with `OCEANPAYMENT_MEDUSA_PAYMENT_PROVIDER_ID` in
 * `apps/medusa-app/src/modules/ocean-payment/config.ts` (optional `NEXT_PUBLIC_OCEAN_MEDUSA_PAYMENT_PROVIDER_ID` here for storefront builds).
 */
export const OCEAN_MEDUSA_PAYMENT_PROVIDER_ID =
  process.env.NEXT_PUBLIC_OCEAN_MEDUSA_PAYMENT_PROVIDER_ID?.trim() ||
  "pp_oceanpayment_oceanpayment";

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
