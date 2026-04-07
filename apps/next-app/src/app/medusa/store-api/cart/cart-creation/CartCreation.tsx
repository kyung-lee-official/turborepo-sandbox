"use client";

import type { StoreApiCartResponse } from "@repo/types";
import type { UseMutationResult } from "@tanstack/react-query";
import { Alert } from "@/app/medusa/components/Alert";
import { Button } from "@/app/medusa/components/Button";
import { Card } from "@/app/medusa/components/Card";
import { InlineCode } from "@/app/medusa/components/InlineCode";

type CartCreationProps = {
  cartId: string | null;
  regionId: string | null;
  /** From `GET /store/customers/me` — when set, cart came from `GET /store-api/carts`. */
  isCustomerSession: boolean;
  onCreateCart: () => void;
  createCartMutation: UseMutationResult<
    StoreApiCartResponse,
    Error,
    string,
    unknown
  >;
};

export const CartCreation = ({
  cartId,
  regionId,
  isCustomerSession,
  onCreateCart,
  createCartMutation,
}: CartCreationProps) => {
  return (
    <Card variant="pixel" className="max-w-none">
      <h2 className="font-bold text-gray-900 text-xl">Cart management</h2>
      <p className="text-gray-600 text-sm leading-relaxed">
        {isCustomerSession ? (
          <>
            Signed-in: cart is loaded via{" "}
            <InlineCode>GET /store-api/carts</InlineCode> (server picks an
            active cart for this region or creates one).
          </>
        ) : (
          <>
            Guest: cart id is kept in <InlineCode>localStorage</InlineCode>{" "}
            (Zustand persist). We reuse{" "}
            <InlineCode>GET /store-api/carts/:id</InlineCode> when possible,
            otherwise <InlineCode>POST /store-api/carts</InlineCode>.
          </>
        )}
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-gray-800 text-sm">
            {cartId ? `Current cart ID: ${cartId}` : "No cart available"}
          </p>
          <p className="mt-1 text-gray-600 text-xs">
            {isCustomerSession
              ? "Use account cart from the server for this region."
              : "Create a new cart to start fresh or replace an invalid/completed one"}
          </p>
        </div>
        {!isCustomerSession && (
          <Button
            type="button"
            variant="primary"
            size="compact"
            fullWidth={false}
            onClick={onCreateCart}
            disabled={!regionId || createCartMutation.isPending}
          >
            {createCartMutation.isPending ? "Creating..." : "Create new cart"}
          </Button>
        )}
      </div>

      {createCartMutation.isError && (
        <Alert title="Could not create cart" variant="error" appearance="pixel">
          Please try again.
        </Alert>
      )}

      {createCartMutation.isSuccess && (
        <Alert title="Cart created" variant="success" appearance="pixel">
          Cart created successfully.
        </Alert>
      )}
    </Card>
  );
};
