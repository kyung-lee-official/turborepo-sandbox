import {
  type MedusaRequest,
  type MedusaResponse,
  type MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http";
import {
  StoreAddCartLineItem,
  StoreCreateCart,
  StoreGetCartsCart,
} from "@medusajs/medusa/api/store/carts/validators";
import { HttpError } from "@repo/types";
import type { NextFunction } from "express";
import * as QueryConfig from "./query-config";

export const storeCartRoutesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
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
    method: ["POST"],
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
  {
    method: ["POST"],
    matcher: "/store-api/carts/:id/line-items",
    middlewares: [
      validateAndTransformBody(StoreAddCartLineItem),
      validateAndTransformQuery(
        StoreGetCartsCart,
        QueryConfig.retrieveTransformQueryConfig,
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/carts/:id/line-items",
    middlewares: [
      (req: MedusaRequest, res: MedusaResponse, next: NextFunction) => {
        throw new HttpError(
          "AUTH.FORBIDDEN",
          "This route has been disabled because the metadata was not asynchronously updated properly. Please use `POST /store-api/carts/:id/line-items` instead.",
        );
      },
    ],
  },
];
