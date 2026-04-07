import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { getOrderDetailWorkflow } from "@medusajs/medusa/core-flows";
import { attachCartIdToOrder } from "../attach-cart-id";

/**
 * Same payload shape as `GET /store/orders/:id`, plus top-level `cart_id` on the order object.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const workflow = getOrderDetailWorkflow(req.scope);
  const { result } = await workflow.run({
    input: {
      fields: req.queryConfig.fields,
      order_id: req.params.id,
      filters: {
        is_draft_order: false,
      },
    },
  });

  const order = await attachCartIdToOrder(req.scope, result as unknown as { id: string } & Record<string, unknown>);

  res.status(200).json({ order });
};
