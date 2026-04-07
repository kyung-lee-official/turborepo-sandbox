import {
  authenticate,
  type MiddlewareRoute,
  validateAndTransformQuery,
} from "@medusajs/framework/http";
import * as OrderQueryConfig from "@medusajs/medusa/api/store/orders/query-config";
import {
  StoreGetOrderParams,
  StoreGetOrdersParams,
} from "@medusajs/medusa/api/store/orders/validators";

export const storeApiOrdersRoutesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store-api/orders",
    middlewares: [
      authenticate("customer", ["session", "bearer"]),
      validateAndTransformQuery(
        StoreGetOrdersParams,
        OrderQueryConfig.listTransformQueryConfig,
      ),
    ],
  },
  {
    method: ["GET"],
    matcher: "/store-api/orders/:id",
    middlewares: [
      validateAndTransformQuery(
        StoreGetOrderParams,
        OrderQueryConfig.retrieveTransformQueryConfig,
      ),
    ],
  },
];
