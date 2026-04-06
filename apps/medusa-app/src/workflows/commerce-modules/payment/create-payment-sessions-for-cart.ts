import {
  createWorkflow,
  transform,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk";
import {
  acquireLockStep,
  type CreatePaymentSessionsWorkflowInput,
  createPaymentCollectionForCartWorkflow,
  createPaymentSessionsWorkflow,
  releaseLockStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows";
import { HttpError } from "@repo/types";

export type CreatePaymentSessionsForCartWorkflowInput = {
  cart_id: string;
  provider_id: string;
  data?: Record<string, unknown>;
};

export const createPaymentSessionsForCartWorkflow = createWorkflow(
  "create-payment-sessions-for-cart",
  (input: CreatePaymentSessionsForCartWorkflowInput) => {
    acquireLockStep({
      key: input.cart_id,
      timeout: 30,
      ttl: 120,
    });

    const { data: initialCarts } = useQueryGraphStep({
      entity: "cart",
      fields: ["id", "payment_collection.id", "shipping_address.*"],
      filters: {
        id: input.cart_id,
      },
    }).config({ name: "load-cart-for-payment-sessions" });

    const hasExistingCollection = transform(
      { initialCarts },
      ({ initialCarts }) => {
        const cart = initialCarts[0];
        if (!cart) {
          throw new HttpError("PAYMENT.RESOURCE_NOT_FOUND", "Cart not found");
        }
        return !!cart.payment_collection?.id;
      },
    );

    // if the cart already has a payment collection,
    // do not call createPaymentCollectionForCartWorkflow (and do not refresh).
    const created = when(
      "create-payment-collection-for-cart",
      { hasExistingCollection },
      ({ hasExistingCollection: exists }) => !exists,
    ).then(() =>
      createPaymentCollectionForCartWorkflow.runAsStep({
        input: {
          cart_id: input.cart_id,
        },
      }),
    );

    // Wait for the create step when it runs; if a collection already exists, only cart_id is needed.
    const cartIdForReload = transform(
      { created, input },
      ({ created: _c, input: workflowInput }) => {
        void _c;
        return workflowInput.cart_id;
      },
    );

    const { data: cartsAfterEnsure } = useQueryGraphStep({
      entity: "cart",
      fields: ["id", "payment_collection.id", "shipping_address.*"],
      filters: {
        id: cartIdForReload,
      },
    }).config({ name: "reload-cart-after-payment-collection" });

    const paymentCollectionId = transform(
      { cartsAfterEnsure },
      ({ cartsAfterEnsure }) => {
        const cart = cartsAfterEnsure[0];
        const id = cart?.payment_collection?.id;
        if (!id) {
          throw new HttpError(
            "PAYMENT.RESOURCE_NOT_FOUND",
            "Payment collection is missing after ensure step",
          );
        }
        return id;
      },
    );

    const createSessionsInput = transform(
      { paymentCollectionId, cartsAfterEnsure, input },
      ({
        paymentCollectionId: collectionId,
        cartsAfterEnsure: carts,
        input: workflowInput,
      }): CreatePaymentSessionsWorkflowInput => {
        const cart = carts[0];
        if (!cart) {
          throw new HttpError(
            "PAYMENT.RESOURCE_NOT_FOUND",
            "Cart not found after payment collection ensure",
          );
        }
        return {
          provider_id: workflowInput.provider_id,
          payment_collection_id: collectionId,
          data: workflowInput.data,
          context: {
            payment_collection_id: collectionId,
            shipping_address: cart.shipping_address,
            custom_id: cart.id,
          },
        };
      },
    );

    const paymentSessions = createPaymentSessionsWorkflow.runAsStep({
      input: createSessionsInput,
    });

    // Same JSON shape as legacy POST /store-api/payment/initialize-payment-session/:id:
    // raw `createPaymentSessionsWorkflow` result (do not nest or add extra top-level fields).
    const result = transform(
      { paymentSessions },
      ({ paymentSessions: workflowResult }) => {
        return workflowResult as unknown as Record<string, unknown>;
      },
    );

    releaseLockStep({
      key: input.cart_id,
    });

    return new WorkflowResponse(result);
  },
);
