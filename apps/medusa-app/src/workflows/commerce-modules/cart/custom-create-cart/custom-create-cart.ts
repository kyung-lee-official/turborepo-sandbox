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
import { loggerStep } from "@/workflows/logger-step";

type WorkflowInput = {
  auth_context?: {
    actor_id?: string;
    actor_type?: string;
  };
  create_cart_input: CreateCartWorkflowInputDTO;
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
      loggerStep({
        input: { message: "Finding existing customer cart" },
      }).config({ name: "find-existing-cart-logger" });
      const { data: existingCarts } = useQueryGraphStep({
        entity: "cart",
        fields: ["id"],
        filters: {
          customer_id: input.auth_context?.actor_id,
          region_id: input.create_cart_input.region_id,
          sales_channel_id: input.create_cart_input.sales_channel_id,
          completed_at: null,
        },
      });

      return existingCarts[0];
    });

    const createdCart = when(
      "create-new-customer-cart",
      { isSignedInCustomer, hasRegionAndSalesChannel, existingCart },
      (data) =>
        !data.isSignedInCustomer ||
        !data.hasRegionAndSalesChannel ||
        !data.existingCart,
    ).then(() => {
      loggerStep({
        input: {
          message: "Creating new customer cart",
          isSignedInCustomer,
          hasRegionAndSalesChannel,
        },
      }).config({
        name: "create-new-cart-logger",
      });
      return createCartWorkflow.runAsStep({
        input: {
          ...input.create_cart_input,
          customer_id: input.auth_context?.actor_id,
        },
      });
    });

    const resultCart = transform({ existingCart, createdCart }, (data) => {
      return data.existingCart ?? data.createdCart;
    });

    return new WorkflowResponse(resultCart);
  },
);
