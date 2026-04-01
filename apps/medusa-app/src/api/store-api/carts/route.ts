import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import type {
  AdditionalData,
  CreateCartWorkflowInputDTO,
  HttpTypes,
} from "@medusajs/framework/types";
import { customCreateCartWorkflow } from "@/workflows/commerce-modules/cart/custom-create-cart/custom-create-cart";
import { refetchCart } from "./helpers";

export const POST = async (
  req: AuthenticatedMedusaRequest<
    HttpTypes.StoreCreateCart & AdditionalData,
    HttpTypes.SelectParams
  >,
  res: MedusaResponse<HttpTypes.StoreCartResponse>,
) => {
  const customerId =
    req.auth_context?.actor_type === "customer"
      ? req.auth_context.actor_id
      : undefined;

  const workflowInput = {
    ...req.validatedBody,
    customer_id: customerId,
    metadata: { unselected: {} },
  } as CreateCartWorkflowInputDTO;

  const { result } = await customCreateCartWorkflow(req.scope).run({
    input: {
      auth_context: req.auth_context,
      create_cart_input: workflowInput,
    },
  });

  const cart = await refetchCart(result.id, req.scope, req.queryConfig.fields);

  res.status(200).json({ cart });
};
