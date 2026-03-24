import {
  type MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http";
import * as QueryConfig from "./query-config";
import { StoreCreateCart, StoreGetCartsCart } from "./validators";

export const storeCartRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/store-api/carts",
    middlewares: [
      validateAndTransformQuery(
        StoreGetCartsCart,
        QueryConfig.retrieveTransformQueryConfig,
      ),
      validateAndTransformBody(StoreCreateCart),
    ],
  },
];
