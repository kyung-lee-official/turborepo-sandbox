import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { completeCartWorkflow } from "@medusajs/medusa/core-flows";
import type { CompleteCartWorkflowInputDTO } from "@medusajs/types/dist/cart/workflows";

/**
 * Thin wrapper around Medusa's official {@link completeCartWorkflow}.
 * Intended for payment-provider webhooks (and similar server callbacks), not the
 * public HTTP complete-cart route, which should call {@link completeCartWorkflow} directly.
 */
export const customCompleteCartWorkflow = createWorkflow(
  "custom-complete-cart",
  (input: CompleteCartWorkflowInputDTO) => {
    const result = completeCartWorkflow.runAsStep({
      input: {
        id: input.id,
      },
    });

    return new WorkflowResponse(result);
  },
);
