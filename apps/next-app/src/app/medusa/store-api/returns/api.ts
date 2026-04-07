import type {
  StoreCreateReturn,
  StoreReturnReasonListResponse,
  StoreReturnResponse,
  StoreShippingOptionListResponse,
} from "@medusajs/types";
import api from "../../axios-error-handling-for-medusa/axios-client";

export async function getReturnReasons() {
  const data = await api.get<StoreReturnReasonListResponse>(
    "/store/return-reasons",
  );
  return data;
}

/** Return shipping options require the cart used at checkout (`GET /store/shipping-options`). */
export async function getReturnShippingOptions(cartId: string) {
  const data = await api.get<StoreShippingOptionListResponse>(
    "/store/shipping-options",
    {
      params: {
        cart_id: cartId,
        is_return: true,
      },
    },
  );
  return data;
}

export async function createReturn(body: StoreCreateReturn) {
  const data = await api.post<StoreReturnResponse>("/store/returns", body);
  return data;
}
