"use client";

import type { StoreCart } from "@medusajs/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMIdStore } from "@/stores/medusa/medusa-entity-id";
import { getMeOrNull } from "../customer/api";
import { createPaymentCollection } from "../payment/api";
import { createCart, getCart, getOrCreateCustomerCart, QK_CART } from "./api";
import { CartAddresses } from "./cart-address/CartAddress";
import { CartCreation } from "./cart-creation/CartCreation";
import { CartInfo } from "./cart-info/CartInfo";
import { CartLineItem } from "./cart-line-item/CartLineItem";
import CartPromotions from "./cart-promotions/CartPromotions";
import { CartShipping } from "./cart-shipping/CartShipping";
import { CartSummary } from "./cart-summary/CartSummary";

const SALES_CHANNEL_ID = process.env.NEXT_PUBLIC_MEDUSA_SALES_CHANNEL_ID;

export const Content = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const hasHydrated = useMIdStore((state) => state.hasHydrated);
  const regionId = useMIdStore((state) => state.regionId);
  const cartId = useMIdStore((state) => state.cartId);
  const setCartId = useMIdStore((state) => state.setCartId);
  const clearCartId = useMIdStore((state) => state.clearCartId);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const sessionQuery = useQuery({
    queryKey: ["store", "customers", "me"],
    queryFn: getMeOrNull,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const isCustomerSession = !!sessionQuery.data?.customer;

  const createCartMutation = useMutation({
    mutationFn: (rid: string) => createCart(rid),
    onSuccess: (data) => {
      setCartId(data.cart.id);
      queryClient.invalidateQueries({
        queryKey: [
          QK_CART.GET_CART,
          regionId,
          sessionQuery.data?.customer?.id ?? "guest",
        ],
      });
    },
  });

  const handleCreateCart = async () => {
    if (!regionId) return;
    try {
      await createCartMutation.mutateAsync(regionId);
    } catch (error) {
      console.error("Failed to create cart:", error);
    }
  };

  const handleCheckout = async () => {
    try {
      if (!cartId) {
        throw new Error("Cart ID is required for checkout");
      }
      setIsCheckingOut(true);
      await createPaymentCollection(cartId);
      router.push(`/medusa/store-api/cart/cart-checkout/${cartId}`);
    } catch (error) {
      console.error("Failed to create payment collection:", error);
      setIsCheckingOut(false);
    }
  };

  const cartQuery = useQuery({
    queryKey: [
      QK_CART.GET_CART,
      regionId,
      sessionQuery.data?.customer?.id ?? "guest",
    ],
    queryFn: async (): Promise<StoreCart> => {
      if (!regionId) {
        throw new Error("Region ID is required");
      }

      const me = sessionQuery.data;

      if (me?.customer) {
        const res = await getOrCreateCustomerCart({
          regionId,
          salesChannelId: SALES_CHANNEL_ID,
        });
        setCartId(res.cart.id);
        return res.cart;
      }

      const storedId = useMIdStore.getState().cartId;
      if (storedId) {
        try {
          const res = await getCart(storedId);
          if (res.cart.completed_at) {
            clearCartId();
            const created = await createCart(regionId);
            setCartId(created.cart.id);
            return created.cart;
          }
          setCartId(res.cart.id);
          return res.cart;
        } catch {
          clearCartId();
          const created = await createCart(regionId);
          setCartId(created.cart.id);
          return created.cart;
        }
      }

      const created = await createCart(regionId);
      setCartId(created.cart.id);
      return created.cart;
    },
    enabled: hasHydrated && !!regionId && sessionQuery.isSuccess,
  });

  if (!regionId) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <h2 className="mb-2 font-semibold text-lg text-yellow-800">
            Region Required
          </h2>
          <p className="text-yellow-700">
            Please select a region on the region page to view cart information.
          </p>
        </div>
      </div>
    );
  }

  if (sessionQuery.isLoading || !hasHydrated) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/4 rounded bg-gray-200"></div>
          <div className="h-64 rounded bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (sessionQuery.isError) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h2 className="mb-2 font-semibold text-lg text-red-800">
            Session Error
          </h2>
          <p className="text-red-700">
            {sessionQuery.error instanceof Error
              ? sessionQuery.error.message
              : "Could not resolve customer session"}
          </p>
        </div>
      </div>
    );
  }

  if (cartQuery.isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/4 rounded bg-gray-200"></div>
          <div className="h-64 rounded bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (cartQuery.isError) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h2 className="mb-2 font-semibold text-lg text-red-800">
            Error Loading Cart
          </h2>
          <p className="text-red-700">
            {cartQuery.error instanceof Error
              ? cartQuery.error.message
              : "Unknown error"}
          </p>
          <CartCreation
            cartId={cartId}
            regionId={regionId}
            isCustomerSession={isCustomerSession}
            onCreateCart={handleCreateCart}
            createCartMutation={createCartMutation}
          />
        </div>
      </div>
    );
  }

  const cart = cartQuery.data;
  if (!cart) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-gray-500">No cart data available</p>

        <CartCreation
          cartId={cartId}
          regionId={regionId}
          isCustomerSession={isCustomerSession}
          onCreateCart={handleCreateCart}
          createCartMutation={createCartMutation}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <details>
        <summary className="cursor-pointer text-gray-500 text-sm">
          Raw Cart Data (for debugging)
        </summary>
        <pre className="mt-2 overflow-auto rounded bg-gray-100 p-4 text-xs">
          {JSON.stringify(cart, null, 2)}
        </pre>
      </details>

      <CartCreation
        cartId={cartId}
        regionId={regionId}
        isCustomerSession={isCustomerSession}
        onCreateCart={handleCreateCart}
        createCartMutation={createCartMutation}
      />

      <div className="border-b pb-4">
        <h1 className="font-bold text-3xl">Shopping Cart</h1>
        <p className="mt-2 text-gray-600">
          Review your cart items and proceed to checkout
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <CartLineItem cart={cart} />
          <CartAddresses cart={cart} />
          <CartShipping cart={cart} />
        </div>

        <div className="space-y-6">
          <CartSummary cart={cart} onCheckout={handleCheckout} />
          <CartInfo cart={cart} />
        </div>
      </div>

      <CartPromotions
        cart={{ cart }}
        onCartUpdate={() => cartQuery.refetch()}
      />
    </div>
  );
};
