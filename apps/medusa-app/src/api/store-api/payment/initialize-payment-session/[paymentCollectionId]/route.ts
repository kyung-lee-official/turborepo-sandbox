import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  type CreatePaymentSessionsWorkflowInput,
  createPaymentSessionsWorkflow,
} from "@medusajs/medusa/core-flows";
import type { StoreInitializePaymentSession } from "@medusajs/types";
import { HttpError } from "@repo/types";
import { getForwardedClientIp } from "@/modules/ocean-payment/http-client-ip";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const paymentCollectionId = req.params.paymentCollectionId;
  const { provider_id, data } =
    (await req.body) as StoreInitializePaymentSession;
  if (!provider_id) {
    throw new HttpError(
      "PAYMENT.MISSING_PAYMENT_PROVIDER",
      "Payment provider ID is required",
    );
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data: paymentCollections } = await query.graph({
    entity: "payment_collection",
    fields: [
      "id",
      "cart.id",
      "cart.email",
      "cart.shipping_address.*",
      "cart.items.title",
      "cart.items.product_title",
      "cart.items.quantity",
      "cart.items.variant_sku",
      "cart.items.item_total",
      "cart.items.subtotal",
    ],
    filters: {
      id: paymentCollectionId,
    },
  });

  const paymentCollection = paymentCollections[0];
  const cart = paymentCollection.cart;
  if (!cart) {
    throw new HttpError(
      "PAYMENT.RESOURCE_NOT_FOUND",
      "Cart associated with the payment collection is required",
    );
  }
  const shippingAddress = cart.shipping_address;
  const billing_ip = getForwardedClientIp(req.headers) ?? "";
  const ocean_cart_lines = Array.isArray(cart.items)
    ? cart.items
        .filter((item): item is NonNullable<typeof item> => item != null)
        .map((item) => {
          const row = item as {
            title?: string | null;
            product_title?: string | null;
            quantity?: number | null;
            variant_sku?: string | null;
            item_total?: number | string | null;
            subtotal?: number | string | null;
          };
          return {
            title: row.title,
            product_title: row.product_title,
            quantity: row.quantity,
            variant_sku: row.variant_sku,
            total: row.item_total ?? row.subtotal,
          };
        })
    : [];

  const { result } = await createPaymentSessionsWorkflow(req.scope).run({
    input: {
      // provider_id determines which payment provider to use
      provider_id: provider_id,
      payment_collection_id: paymentCollectionId,
      data: data,
      context: {
        payment_collection_id: paymentCollectionId,
        shipping_address: shippingAddress,
        custom_id: cart.id,
        customer_email: cart.email ?? "",
        billing_ip,
        ocean_cart_lines,
      },
    } as CreatePaymentSessionsWorkflowInput,
  });

  res.send(result);
  return;
}
