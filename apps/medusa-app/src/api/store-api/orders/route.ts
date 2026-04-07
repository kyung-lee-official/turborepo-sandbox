import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { getOrdersListWorkflow } from "@medusajs/medusa/core-flows";
import { attachCartIdsToOrders } from "./attach-cart-id";

/**
 * Same behavior as `GET /store/orders`, plus `cart_id` on each order (linked checkout cart).
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const variables = {
    filters: {
      ...req.filterableFields,
      is_draft_order: false,
      customer_id: req.auth_context.actor_id,
    },
    ...req.queryConfig.pagination,
  };

  const workflow = getOrdersListWorkflow(req.scope);
  const { result } = await workflow.run({
    input: {
      fields: req.queryConfig.fields,
      variables,
    },
  });

  const { rows, metadata } = result as {
    rows: { id: string }[];
    metadata: { count: number; skip: number; take: number };
  };
  const orders = await attachCartIdsToOrders(req.scope, rows);

  res.json({
    orders,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  });
};
