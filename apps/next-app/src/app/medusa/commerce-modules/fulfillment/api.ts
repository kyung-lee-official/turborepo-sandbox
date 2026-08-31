import type { FetcherOptions } from "@/lib/fetcher";
import { get } from "@/lib/fetcher";

export enum FulfillmentQK {
  GET_SHIPPING_OPTIONS_BY_CART_ID = "get_shipping_options_by_cart_id",
  GET_SHIPPING_OPTION_BY_ID = "get_shipping_option_by_id",
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

/* === shipping options === */

export const getShippingOptionsByCartId = async (cartId: string) => {
  return get(
    `/commerce-modules/fulfillment/get-shipping-options-by-cart-id/${cartId}`,
    medusaOptions(),
  );
};

export const getShippingOptionById = async (shippingOptionId: string) => {
  return get(
    `/commerce-modules/fulfillment/get-shipping-option-by-id/${shippingOptionId}`,
    medusaOptions(),
  );
};
