import type { FetcherOptions } from "@/lib/fetcher";
import { get, post } from "@/lib/fetcher";

export enum PaymentQK {
  GET_PAYMENT_COLLECTION_BY_ID = "get-payment-collection-by-id",
  GET_PAYMENT_COLLECTION_BY_CART_ID = "get-payment-collection-by-cart-id",
  GET_PAYMENT_PROVIDERS_BY_REGION_ID = "get-payment-providers-by-region-id",
  GET_PAYMENT_SESSION_BY_PAYMENT_COLLECTION_ID = "get-payment-session-by-payment-collection-id",
  GET_PAYMENT_BY_ID = "get-payment-by-id",
}

function medusaOptions(): Pick<FetcherOptions, "baseURL" | "headers"> {
  return {
    baseURL: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
    headers: {
      "x-publishable-api-key":
        process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "",
    },
  };
}

export async function getPaymentCollectionById(paymentCollectionId: string) {
  return get(
    `/commerce-modules/payment/payment-collection/${paymentCollectionId}`,
    medusaOptions(),
  );
}

export async function getPaymentCollectionByCartId(cartId: string) {
  return get(
    `/commerce-modules/payment/payment-collection/get-payment-collection-by-cart-id/${cartId}`,
    medusaOptions(),
  );
}

export async function getPaymentProvidersByRegionId(regionId: string) {
  return get(
    `/commerce-modules/payment/payment-provider/get-payment-providers-by-region-id/${regionId}`,
    medusaOptions(),
  );
}

export async function createPaymentSession(
  paymentCollectionId: string,
  paymentProviderId: string,
) {
  return post(
    `/commerce-modules/payment/payment-session/create-payment-session`,
    {
      payment_collection_id: paymentCollectionId,
      provider_id: paymentProviderId,
    },
    medusaOptions(),
  );
}

export async function getPaymentSessionByPaymentCollectionId(
  paymentCollectionId: string,
) {
  return get(
    `/commerce-modules/payment/payment-session/get-payment-session-by-payment-collection-id/${paymentCollectionId}`,
    medusaOptions(),
  );
}

export async function authorizePaymentSession(paymentSessionId: string) {
  return post(
    `/commerce-modules/payment/payment-session/authorize-payment-session/${paymentSessionId}`,
    {},
    medusaOptions(),
  );
}

export async function getPaymentById(paymentId: string) {
  return get(
    `/commerce-modules/payment/get-payment-by-id/${paymentId}`,
    medusaOptions(),
  );
}
