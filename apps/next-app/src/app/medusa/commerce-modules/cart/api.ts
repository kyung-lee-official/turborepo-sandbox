import type { FetcherOptions } from "@/lib/fetcher";
import { del, get, post, put } from "@/lib/fetcher";

export enum CartQK {
  GET_CART_BY_ID = "get-cart-by-id",
  GET_CART_BY_REGION_ID_AND_SALES_CHANNEL_ID_AND_CUSTOMER_ID = "get-cart-by-region-id-and-sales-channel-id-and-customer-id",
  GET_CART_BY_PAYMENT_COLLECTION_ID = "get-cart-by-payment-collection-id",
  GET_CART_CHECKOUT_INFO_BY_ID = "get-cart-checkout-info-by-id",
  GET_CARTS_BY_CUSTOMER_ID = "get-carts-by-customer-id",
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

export async function getCartById(cartId: string) {
  return get(`/commerce-modules/cart/${cartId}`, medusaOptions());
}

/**
 * This function tries to get a cart by regionId, salesChannelId and customerId.
 * If no cart exists, it creates a new one.
 * @param regionId
 * @param salesChannelId
 * @param customerId
 * @returns cart info
 */
export async function getCartByRegionIdSalesChannelIdCustomerId(
  regionId: string,
  salesChannelId: string,
  customerId: string,
) {
  return get(
    `/commerce-modules/cart/get-cart-by-region-sales-channel-customer`,
    {
      ...medusaOptions(),
      params: {
        region_id: regionId,
        sales_channel_id: salesChannelId,
        customer_id: customerId,
      },
    },
  );
}

export async function getCartCheckoutInfoById(cartId: string) {
  return get(`/commerce-modules/cart/checkout-info/${cartId}`, medusaOptions());
}

export async function getCartByPaymentCollectionId(
  paymentCollectionId: string,
) {
  return get(
    `/commerce-modules/cart/get-cart-by-payment-collection-id/${paymentCollectionId}`,
    medusaOptions(),
  );
}

export async function getCartsByCustomerId(customerId: string) {
  return get(
    `/commerce-modules/cart/get-carts-by-customer-id/${customerId}`,
    medusaOptions(),
  );
}

export async function updateCart(cartId: string, payload: unknown) {
  return put(`/commerce-modules/cart/${cartId}`, payload, medusaOptions());
}

/* === address === */
export async function linkShippingAddressToCart(
  cartId: string,
  addressId: string,
) {
  return post(
    `/commerce-modules/cart/shipping-address/${cartId}`,
    { address_id: addressId },
    medusaOptions(),
  );
}

/* === shipping === */

export async function linkShippingMethodToCart(
  cartId: string,
  shippingOptionId: string,
) {
  return post(
    `/commerce-modules/cart/shipping-method/${cartId}`,
    { shippingOptionId: shippingOptionId },
    medusaOptions(),
  );
}

/* === checkout === */

export async function completePaymentCollection(cartId: string) {
  return post(
    `/commerce-modules/cart/checkout/create-payment-collection/${cartId}`,
    {},
    medusaOptions(),
  );
}

/* === danger zone === */

export async function forceCompleteCart(cartId: string) {
  return post(
    `/commerce-modules/cart/force-complete-cart/${cartId}`,
    {},
    medusaOptions(),
  );
}

export async function deleteCart(cartId: string) {
  return del(`/commerce-modules/cart/${cartId}`, medusaOptions());
}
