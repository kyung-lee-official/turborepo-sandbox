import {
  type MiddlewareRoute,
  validateAndTransformQuery,
} from "@medusajs/framework/http";
import { storeSearchTransformQueryConfig } from "./query-config";
import { StoreSearchQuery } from "./validators";

export const storeApiSearchRoutesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store-api/search",
    middlewares: [
      validateAndTransformQuery(
        StoreSearchQuery,
        storeSearchTransformQueryConfig,
      ),
    ],
  },
];
