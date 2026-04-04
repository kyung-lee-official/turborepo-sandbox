"use client";

import type { StoreCartResponse } from "@medusajs/types";
import type { UseMutationResult } from "@tanstack/react-query";

type CartCreationProps = {
  cartId: string | null;
  regionId: string | null;
  /** From `GET /store/customers/me` — when set, cart came from `GET /store-api/carts`. */
  isCustomerSession: boolean;
  onCreateCart: () => void;
  createCartMutation: UseMutationResult<
    StoreCartResponse,
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
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-semibold text-xl">Cart Management</h2>
      <p className="mb-3 text-gray-600 text-sm">
        {isCustomerSession ? (
          <>
            Signed-in: cart is loaded via{" "}
            <code className="rounded bg-gray-100 px-1 text-xs">
              GET /store-api/carts
            </code>{" "}
            (server picks an active cart for this region or creates one).
          </>
        ) : (
          <>
            Guest: cart id is kept in{" "}
            <code className="rounded bg-gray-100 px-1 text-xs">
              localStorage
            </code>{" "}
            (Zustand persist). We reuse{" "}
            <code className="rounded bg-gray-100 px-1 text-xs">
              GET /store-api/carts/:id
            </code>{" "}
            when possible, otherwise{" "}
            <code className="rounded bg-gray-100 px-1 text-xs">
              POST /store-api/carts
            </code>
            .
          </>
        )}
      </p>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-700 text-sm">
            {cartId ? `Current Cart ID: ${cartId}` : "No cart available"}
          </p>
          <p className="mt-1 text-gray-600 text-xs">
            {isCustomerSession
              ? "Use account cart from the server for this region."
              : "Create a new cart to start fresh or replace an invalid/completed one"}
          </p>
        </div>
        {!isCustomerSession && (
          <button
            onClick={onCreateCart}
            disabled={!regionId || createCartMutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {createCartMutation.isPending ? (
              <span className="flex items-center">
                <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Creating...
              </span>
            ) : (
              "Create New Cart"
            )}
          </button>
        )}
      </div>

      {createCartMutation.isError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-red-700 text-sm">
            Failed to create cart. Please try again.
          </p>
        </div>
      )}

      {createCartMutation.isSuccess && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-green-700 text-sm">Cart created successfully!</p>
        </div>
      )}
    </div>
  );
};
