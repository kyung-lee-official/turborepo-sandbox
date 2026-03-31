import type { StoreCartResponse } from "@medusajs/types";
import api from "../../axios-error-handling-for-medusa/axios-client";

export enum QK_CART {
  GET_CART = "get_cart",
  CREATE_CART = "create_cart",
}

export async function getCart(id: string) {
  const data = await api.post<StoreCartResponse>(`/store/carts/${id}`);
  return data;
}

export async function createCart(regionId?: string) {
  const data = await api.post<StoreCartResponse>("/store-api/carts", {
    region_id: regionId,
  });
  return data;
}

export async function updateACart(
  cartId: string,
  updates: Record<string, unknown>,
) {
  const data = await api.post<StoreCartResponse>(
    `/store/carts/${cartId}`,
    updates,
  );
  return data;
}

export async function addLineItem(
  cartId: string,
  variantId: string,
  quantity: number = 1,
) {
  const data = await api.post<StoreCartResponse>(
    `/store-api/carts/${cartId}/line-items`,
    {
      variant_id: variantId,
      quantity: quantity,
    },
  );
  return data;
}

export async function updateLineItem(
  cartId: string,
  lineItemId: string,
  quantity: number,
) {
  const data = await api.post<StoreCartResponse>(
    `/store/carts/${cartId}/line-items/${lineItemId}`,
    {
      quantity: quantity,
    },
  );
  return data;
}

export async function unselectLineItem(cartId: string, lineId: string) {
  const data = await api.del<StoreCartResponse>(
    `/store-api/carts/${cartId}/line-items/${lineId}/unselect`,
  );
  return data;
}

export async function removeLineItem(cartId: string, lineItemId: string) {
  const data = await api.del<StoreCartResponse>(
    `/store/carts/${cartId}/line-items/${lineItemId}`,
  );
  return data;
}

export async function updateCartShippingMethod(
  cartId: string,
  optionId: string,
) {
  const data = await api.post<StoreCartResponse>(
    `/store/carts/${cartId}/shipping-methods`,
    {
      option_id: optionId,
    },
  );
  return data;
}

export async function addPromotions(cartId: string, code: string) {
  const data = await api.post<StoreCartResponse>(
    `/store/carts/${cartId}/promotions`,
    {
      promo_codes: [code],
    },
  );
  return data;
}

export async function removePromotions(cartId: string, code: string) {
  const data = await api.del<StoreCartResponse>(
    `/store/carts/${cartId}/promotions`,
    {
      promo_codes: [code],
    },
  );
  return data;
}
