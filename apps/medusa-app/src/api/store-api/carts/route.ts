import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import type {
  AdditionalData,
  CreateCartWorkflowInputDTO,
  HttpTypes,
} from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { HttpError } from "@repo/types";
import { customCreateCartWorkflow } from "@/workflows/commerce-modules/cart/custom-create-cart/custom-create-cart";
import { refetchCart } from "./helpers";
import type { StoreGetOrCreateCustomerCartType } from "./validators";

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

export const GET = async (
  req: AuthenticatedMedusaRequest<
    Record<string, never>, // empty body
    StoreGetOrCreateCustomerCartType
  >,
  res: MedusaResponse<HttpTypes.StoreCartResponse>,
) => {
  const customerId =
    req.auth_context?.actor_type === "customer"
      ? req.auth_context.actor_id
      : undefined;

  if (!customerId) {
    throw new HttpError(
      "AUTH.UNAUTHORIZED",
      "Customer authentication is required",
    );
  }

  const { region_id, sales_channel_id } = req.validatedQuery;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: carts } = await query.graph({
    entity: "cart",
    fields: ["id", "created_at"],
    filters: {
      customer_id: customerId,
      region_id,
      sales_channel_id,
      completed_at: null,
    },
  });

  const latestCart = carts.reduce((latest, current) => {
    if (!latest) {
      return current;
    }

    const latestTime = new Date(latest.created_at).getTime();
    const currentTime = new Date(current.created_at).getTime();
    return currentTime > latestTime ? current : latest;
  }, carts[0]);

  if (latestCart?.id) {
    const cart = await refetchCart(
      latestCart.id,
      req.scope,
      req.queryConfig.fields,
    );
    return res.status(200).json({ cart });
  }

  const workflowInput = {
    region_id,
    sales_channel_id,
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
  return res.status(200).json({ cart });
};
