import {
  authenticate,
  type MedusaRequest,
  type MedusaResponse,
  type MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http";
import {
  StoreCreateCart,
  StoreGetCartsCart,
} from "@medusajs/medusa/api/store/carts/validators";
import { HttpError } from "@repo/types";
import type { NextFunction } from "express";
import * as QueryConfig from "./query-config";
import {
  DeleteLineItemRequest,
  StoreAddCartLineItem,
  StoreSelectCartLineItem,
  UpdateLineItemRequest,
} from "./validators";

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
      authenticate("customer", ["session", "bearer"], {
        allowUnregistered: true, // allows guest customers too
      }),
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
    matcher: "/store-api/carts/:id/line-items/select",
    middlewares: [
      validateAndTransformBody(StoreSelectCartLineItem),
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
  {
    method: ["POST"],
    matcher: "/store-api/carts/:id/line-items/:line_id",
    middlewares: [
      validateAndTransformBody(UpdateLineItemRequest),
      validateAndTransformQuery(
        StoreGetCartsCart,
        QueryConfig.retrieveTransformQueryConfig,
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/carts/:id/line-items/:line_id",
    middlewares: [
      (req: MedusaRequest, res: MedusaResponse, next: NextFunction) => {
        throw new HttpError(
          "AUTH.FORBIDDEN",
          "This route has been disabled because metadata and unselected-item behavior are managed by custom workflows. Please use `POST /store-api/carts/:id/line-items/:line_id` instead.",
        );
      },
    ],
  },
  {
    method: ["POST"],
    matcher: "/store-api/carts/:id/delete-line-item",
    middlewares: [
      validateAndTransformBody(DeleteLineItemRequest),
      validateAndTransformQuery(
        StoreGetCartsCart,
        QueryConfig.retrieveTransformQueryConfig,
      ),
    ],
  },
];
