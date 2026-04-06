import type {
  StoreOrderListResponse,
  StoreOrderResponse,
} from "@medusajs/types";
import api from "../../axios-error-handling-for-medusa/axios-client";

/** Lists customer orders; default sort is newest first (`-created_at`). */
export async function listOrders(params?: {
  limit?: number;
  offset?: number;
  order?: string;
}) {
  const data = await api.get<StoreOrderListResponse>(`/store/orders`, {
    params: {
      order: "-created_at",
      ...params,
    },
  });
  return data;
}

export async function getOrder(id: string) {
  const data = await api.get<StoreOrderResponse>(`/store/orders/${id}`);
  return data;
}
