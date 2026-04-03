import {
  type MiddlewareRoute,
  validateAndTransformBody,
} from "@medusajs/framework/http";
import { StoreCreatePaymentSessions } from "./validators";

export const storePaymentSessionsRoutesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/store-api/payment-sessions",
    middlewares: [validateAndTransformBody(StoreCreatePaymentSessions)],
  },
];
