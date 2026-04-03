import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils";
import type { MedusaContainer, RemoteQueryFunction } from "@medusajs/types";
import type { CartMetadata } from "@repo/types";
import { HttpError } from "@repo/types";

export const refetchCart = async (
  id: string,
  scope: MedusaContainer,
  fields: string[],
) => {
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

  if (Array.isArray(cart.items)) {
    cart.items.sort(
      (a: { created_at?: string }, b: { created_at?: string }) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime(),
    );
  }

  if (cart.metadata) {
    const unselected =
      (cart.metadata as unknown as CartMetadata)?.unselected || {};
    (cart.metadata as unknown as CartMetadata).unselected = Object.fromEntries(
      Object.entries(unselected).sort(
        ([, a], [, b]) =>
          new Date((b as { created_at?: string }).created_at || 0).getTime() -
          new Date((a as { created_at?: string }).created_at || 0).getTime(),
      ),
    ) as CartMetadata["unselected"];
  }

  return cart;
};
