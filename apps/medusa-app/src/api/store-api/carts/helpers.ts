import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils";
import type { MedusaContainer, RemoteQueryFunction } from "@medusajs/types";
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

  return cart;
};
