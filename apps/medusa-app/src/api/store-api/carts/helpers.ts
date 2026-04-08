import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils";
import { refreshCartItemsWorkflow } from "@medusajs/medusa/core-flows";
import type { MedusaContainer, RemoteQueryFunction } from "@medusajs/types";
import { HttpError } from "@repo/types";
import { applyStoreCartDisplayOrder } from "./apply-store-cart-display-order";
import { syncUnselectedMetadataFromCatalog } from "./sync-unselected-metadata-from-catalog";

export const refetchCart = async (
  id: string,
  scope: MedusaContainer,
  fields: string[],
) => {
  await refreshCartItemsWorkflow(scope).run({
    input: {
      cart_id: id,
      force_refresh: true,
    },
  });

  await syncUnselectedMetadataFromCatalog(id, scope);

  const remoteQuery = scope.resolve(
    ContainerRegistrationKeys.REMOTE_QUERY,
  ) as RemoteQueryFunction;
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "cart",
    variables: { filters: { id } },
    fields,
  });

  const [cart] = await remoteQuery(queryObject);

  if (!cart) {
    throw new HttpError("MEDUSA.NOT_FOUND", `Cart with id '${id}' not found`);
  }

  applyStoreCartDisplayOrder(cart as Record<string, unknown>);

  return cart;
};
