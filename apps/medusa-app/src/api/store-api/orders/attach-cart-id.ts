import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

type OrderRow = Record<string, unknown> & { id: string };

/**
 * Resolves linked cart ids for orders via Query (`order` → `cart` module link).
 */
export async function attachCartIdsToOrders(
  container: MedusaContainer,
  orders: OrderRow[],
): Promise<Array<OrderRow & { cart_id: string | null }>> {
  if (orders.length === 0) {
    return [];
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: linked } = await query.graph({
    entity: "order",
    fields: ["id", "cart.id"],
    filters: {
      id: orders.map((o) => o.id),
    },
  });

  const cartIdByOrderId = new Map<string, string | null>();
  for (const row of linked ?? []) {
    const r = row as { id: string; cart?: { id?: string } | null };
    cartIdByOrderId.set(r.id, r.cart?.id ?? null);
  }

  return orders.map((order) => ({
    ...order,
    cart_id: cartIdByOrderId.get(order.id) ?? null,
  }));
}

export async function attachCartIdToOrder(
  container: MedusaContainer,
  order: OrderRow,
): Promise<OrderRow & { cart_id: string | null }> {
  const [withCart] = await attachCartIdsToOrders(container, [order]);
  return withCart ?? { ...order, cart_id: null };
}
