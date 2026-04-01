import type { CreateCartWorkflowInputDTO } from "@medusajs/framework/types";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk";
import {
  createCartWorkflow,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows";
import { HttpError } from "@repo/types";

type WorkflowInput = {
  auth_context?: {
    actor_id?: string;
    actor_type?: string;
  };
  create_cart_input: CreateCartWorkflowInputDTO;
};

type WorkflowOutput = {
  id: string;
};

export const customCreateCartWorkflow = createWorkflow(
  "custom-create-cart",
  (input: WorkflowInput) => {
    const isSignedInCustomer = transform(input, (data) => {
      return (
        data.auth_context?.actor_type === "customer" &&
        !!data.auth_context?.actor_id
      );
    });

    const hasRegionAndSalesChannel = transform(input, (data) => {
      //   return (
      //     !!data.create_cart_input.region_id &&
      //     !!data.create_cart_input.sales_channel_id
      //   );
      return !!data.create_cart_input.region_id;
    });

    const existingCart = when(
      "find-existing-customer-cart",
      { isSignedInCustomer, hasRegionAndSalesChannel },
      (data) => data.isSignedInCustomer && data.hasRegionAndSalesChannel,
    ).then(() => {
      const { data: existingCarts } = useQueryGraphStep({
        entity: "cart",
        fields: ["id", "created_at"],
        filters: {
          customer_id: input.auth_context?.actor_id,
          region_id: input.create_cart_input.region_id,
          sales_channel_id: input.create_cart_input.sales_channel_id,
          completed_at: null,
        },
      });

      const latestCart = transform({ existingCarts }, (data) =>
        data.existingCarts.reduce((latest, current) => {
          if (!latest) {
            return current;
          }

          const latestTime = new Date(latest.created_at).getTime();
          const currentTime = new Date(current.created_at).getTime();

          return currentTime > latestTime ? current : latest;
        }, data.existingCarts[0]),
      );

      return latestCart;
    });

    const createdCart = when(
      "create-new-customer-cart",
      { isSignedInCustomer, hasRegionAndSalesChannel, existingCart },
      (data) =>
        !data.isSignedInCustomer ||
        !data.hasRegionAndSalesChannel ||
        !data.existingCart,
    ).then(() => {
      return createCartWorkflow.runAsStep({
        input: {
          ...input.create_cart_input,
          customer_id: input.auth_context?.actor_id,
        },
      });
    });

    const resultCart = transform(
      { existingCart, createdCart },
      (data): WorkflowOutput => {
        const cart = data.existingCart ?? data.createdCart;

        if (!cart?.id) {
          throw new HttpError(
            "SYSTEM.WORKFLOW_INVARIANT",
            "Cart resolution failed in custom-create-cart workflow",
          );
        }

        return { id: cart.id };
      },
    );

    return new WorkflowResponse(resultCart);
  },
);
