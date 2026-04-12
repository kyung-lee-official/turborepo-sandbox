import type { StoreCartResponse } from "@medusajs/types";
import type { StoreApiCartResponse } from "@repo/types";
import api from "../../axios-error-handling-for-medusa/axios-client";

/**
 * Custom `/store-api/carts` responses are typed as `StoreApiCartResponse`. Each
 * `cart.display_lines` row is `{ kind, item }` (line item vs unselected snapshot).
 */
export enum QK_CART {
  GET_CART = "get_cart",
  CREATE_CART = "create_cart",
}

/** Retrieve cart with store ordering/metadata via custom store API. */
export async function getCart(id: string) {
  const data = await api.get<StoreApiCartResponse>(`/store-api/carts/${id}`);
  return data;
}

export async function createCart(regionId?: string) {
  const data = await api.post<StoreApiCartResponse>("/store-api/carts", {
    region_id: regionId,
  });
  return data;
}

/** Signed-in only: backend returns existing active cart for region or creates one. */
export async function getOrCreateCustomerCart(options: {
  regionId: string;
  salesChannelId?: string;
}) {
  const data = await api.get<StoreApiCartResponse>(`/store-api/carts`, {
    params: {
      region_id: options.regionId,
      ...(options.salesChannelId
        ? { sales_channel_id: options.salesChannelId }
        : {}),
    },
  });
  return data;
}

export async function updateACart(
  cartId: string,
  updates: Record<string, unknown>,
) {
  const data = await api.post<StoreApiCartResponse>(
    `/store-api/carts/${cartId}`,
    updates,
  );
  return data;
}

export async function addLineItem(
  cartId: string,
  variantId: string,
  quantity: number = 1,
) {
  const data = await api.post<StoreApiCartResponse>(
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
  const data = await api.post<StoreApiCartResponse>(
    `/store-api/carts/${cartId}/line-items/${lineItemId}`,
    {
      quantity: quantity,
    },
  );
  return data;
}

export async function unselectLineItem(cartId: string, lineId: string) {
  const data = await api.del<StoreApiCartResponse>(
    `/store-api/carts/${cartId}/line-items/${lineId}/unselect`,
  );
  return data;
}

/** Absolute quantity for a variant: line item only, `metadata.unselected` cleared for that variant. */
export async function setVariantQuantity(
  cartId: string,
  variantId: string,
  quantity: number,
) {
  const data = await api.post<StoreApiCartResponse>(
    `/store-api/carts/${cartId}/variants/${variantId}/quantity`,
    { quantity },
  );
  return data;
}

export async function removeLineItem(cartId: string, lineItemId: string) {
  const data = await api.post<StoreApiCartResponse>(
    `/store-api/carts/${cartId}/delete-line-item`,
    { item_id: lineItemId },
  );
  return data;
}

export async function updateCartShippingMethod(
  cartId: string,
  optionId: string,
) {
  // No `/store-api/carts/.../shipping-methods` route in medusa-app yet.
  const data = await api.post<StoreCartResponse>(
    `/store/carts/${cartId}/shipping-methods`,
    {
      option_id: optionId,
    },
  );
  return data;
}

export async function addPromotions(cartId: string, code: string) {
  // No `/store-api/carts/.../promotions` route in medusa-app yet.
  const data = await api.post<StoreCartResponse>(
    `/store/carts/${cartId}/promotions`,
    {
      promo_codes: [code],
    },
  );
  return data;
}

export async function removePromotions(cartId: string, code: string) {
  // No `/store-api/carts/.../promotions` route in medusa-app yet.
  const data = await api.del<StoreCartResponse>(
    `/store/carts/${cartId}/promotions`,
    {
      promo_codes: [code],
    },
  );
  return data;
}
