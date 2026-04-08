import {
  type MiddlewareRoute,
  validateAndTransformBody,
} from "@medusajs/framework/http";
import { StoreSearch } from "./validators";

export const storeApiSearchRoutesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/store-api/search",
    middlewares: [validateAndTransformBody(StoreSearch)],
  },
];
