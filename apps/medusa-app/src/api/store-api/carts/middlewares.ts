import {
  type MedusaRequest,
  type MedusaResponse,
  type MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http";
import { HttpError } from "@repo/types";
import type { NextFunction } from "express";
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
  // block the old route for carts to avoid confusion
  {
    methods: ["POST"],
    matcher: "/store/carts",
    middlewares: [
      (req: MedusaRequest, res: MedusaResponse, next: NextFunction) => {
        throw new HttpError(
          "AUTH.FORBIDDEN",
          "This route has been disabled because the metadata was not initialized properly. Please use `POST /store-api/carts` instead.",
        );
      },
    ],
  },
];
