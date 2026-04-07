import type { StoreOrder, StoreOrderListResponse } from "@medusajs/types";
import api from "../../axios-error-handling-for-medusa/axios-client";

/** Order payload from custom `GET /store-api/orders*` (linked checkout cart id). */
export type StoreOrderWithCartId = StoreOrder & { cart_id?: string | null };

export type StoreOrderListWithCartResponse = Omit<
  StoreOrderListResponse,
  "orders"
> & {
  orders: StoreOrderWithCartId[];
};

export type StoreOrderResponseWithCart = {
  order: StoreOrderWithCartId;
};

/** Lists customer orders; default sort is newest first (`-created_at`). Uses custom store route with `cart_id`. */
export async function listOrders(params?: {
  limit?: number;
  offset?: number;
  order?: string;
}) {
  const data = await api.get<StoreOrderListWithCartResponse>(
    `/store-api/orders`,
    {
      params: {
        order: "-created_at",
        ...params,
      },
    },
  );
  return data;
}

export async function getOrder(id: string, options?: { fields?: string }) {
  const data = await api.get<StoreOrderResponseWithCart>(
    `/store-api/orders/${id}`,
    {
      params: options?.fields ? { fields: options.fields } : undefined,
    },
  );
  return data;
}
