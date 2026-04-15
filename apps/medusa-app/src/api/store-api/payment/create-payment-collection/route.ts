import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import { createPaymentCollectionForCartWorkflow } from "@medusajs/medusa/core-flows";
import type { CreatePaymentCollectionForCartWorkflowInputDTO } from "@medusajs/types";
import { HttpError } from "@repo/types";

/**
 * Fields chosen so an existing linked collection matches the shape of
 * `createPaymentCollectionForCartWorkflow` result (`created[0]` — a payment collection DTO)
 * as closely as a graph load allows (same entity, plus common relations).
 */
const CART_WITH_PAYMENT_COLLECTION_FIELDS = [
  "id",
  "payment_collection.*",
  "payment_collection.payment_sessions.*",
  "payment_collection.payment_providers.*",
] as const;

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const input =
    (await req.body) as CreatePaymentCollectionForCartWorkflowInputDTO;

  if (!input?.cart_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "cart_id is required",
    );
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data: carts } = await query.graph({
    entity: "cart",
    fields: [...CART_WITH_PAYMENT_COLLECTION_FIELDS],
    filters: {
      id: input.cart_id,
    },
  });

  const cart = carts[0];
  if (!cart) {
    throw new HttpError("PAYMENT.RESOURCE_NOT_FOUND", "Cart not found");
  }

  const existing = cart.payment_collection;
  if (
    existing &&
    typeof existing === "object" &&
    "id" in existing &&
    typeof existing.id === "string" &&
    existing.id.length > 0
  ) {
    // Same root JSON shape as `res.send(result)` after create: the payment collection DTO.
    res.send(existing);
    return;
  }

  const { result } = await createPaymentCollectionForCartWorkflow(
    req.scope,
  ).run({
    input: input,
  });

  res.send(result);
  return;
}
