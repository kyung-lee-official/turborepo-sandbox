import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import type {
  AdditionalData,
  CreateCartWorkflowInputDTO,
  HttpTypes,
} from "@medusajs/framework/types";
import { createCartWorkflow } from "@medusajs/medusa/core-flows";
import { refetchCart } from "./helpers";

export const POST = async (
  req: AuthenticatedMedusaRequest<
    HttpTypes.StoreCreateCart & AdditionalData,
    HttpTypes.SelectParams
  >,
  res: MedusaResponse<HttpTypes.StoreCartResponse>,
) => {
  const workflowInput = {
    ...req.validatedBody,
    customer_id: req.auth_context?.actor_id,
    metadata: { unselected: {} },
  } as CreateCartWorkflowInputDTO;

  const { result } = await createCartWorkflow(req.scope).run({
    input: workflowInput,
  });

  const cart = await refetchCart(result.id, req.scope, req.queryConfig.fields);

  res.status(200).json({ cart });
};
