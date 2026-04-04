import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { HttpTypes } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { updateCartWorkflowId } from "@medusajs/medusa/core-flows";
import { HttpError } from "@repo/types";
import { refetchCart } from "../helpers";
import type { StoreUpdateCartNoMetadataType } from "../validators";

export const GET = async (
  req: MedusaRequest<unknown, HttpTypes.SelectParams>,
  res: MedusaResponse<HttpTypes.StoreCartResponse>,
) => {
  const cartId = req.params.id;
  if (!cartId) {
    throw new HttpError("MEDUSA.INVALID_DATA", "Cart id is required");
  }
  const cart = await refetchCart(cartId, req.scope, req.queryConfig.fields);
  res.status(200).json({ cart });
};

export const POST = async (
  req: MedusaRequest<StoreUpdateCartNoMetadataType, HttpTypes.SelectParams>,
  res: MedusaResponse<HttpTypes.StoreCartResponse>,
) => {
  const we = req.scope.resolve(Modules.WORKFLOW_ENGINE);
  await we.run(updateCartWorkflowId, {
    input: {
      ...req.validatedBody,
      id: req.params.id,
      additional_data: req.validatedBody.additional_data,
    },
  });
  const cart = await refetchCart(
    req.params.id,
    req.scope,
    req.queryConfig.fields,
  );
  res.status(200).json({ cart });
};
