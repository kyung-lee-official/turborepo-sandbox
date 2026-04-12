"use client";

import type { StoreApiCart } from "@repo/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/app/medusa/components/Alert";
import { PageHeading } from "@/app/medusa/components/PageHeading";
import { PixelSurface } from "@/app/medusa/components/PixelSurface";
import { useMIdStore } from "@/stores/medusa/medusa-entity-id";
import { getMeOrNull } from "../customer/api";
import {
  createPaymentCollection,
  createPaymentSessionsForCart,
} from "../payment/api";
import { createCart, getCart, getOrCreateCustomerCart, QK_CART } from "./api";
import { CartAddresses } from "./cart-address/CartAddress";
import {
  getProviderConfig,
  handlePostInitialization,
} from "./cart-checkout/[cartId]/PaymentProviderService";
import { CartCreation } from "./cart-creation/CartCreation";
import { CartInfo } from "./cart-info/CartInfo";
import { CartLineItem } from "./cart-line-item/CartLineItem";
import CartPromotions from "./cart-promotions/CartPromotions";
import { CartShipping } from "./cart-shipping/CartShipping";
import { CartSummary, type CheckoutFlowMode } from "./cart-summary/CartSummary";

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
  const [checkoutMode, setCheckoutMode] =
    useState<CheckoutFlowMode>("one-step");
  const [selectedProviderId, setSelectedProviderId] = useState("");

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

  const handleCheckoutModeChange = (mode: CheckoutFlowMode) => {
    setCheckoutMode(mode);
    if (mode === "two-step") {
      setSelectedProviderId("");
    }
  };

  const handleCheckout = async () => {
    if (!cartId) {
      console.error("Cart ID is required for checkout");
      return;
    }
    setIsCheckingOut(true);
    try {
      if (checkoutMode === "two-step") {
        await createPaymentCollection(cartId);
        router.push(`/medusa/store-api/cart/cart-checkout/${cartId}`);
        return;
      }

      if (!selectedProviderId) {
        return;
      }

      const result = await createPaymentSessionsForCart({
        cart_id: cartId,
        provider_id: selectedProviderId,
        data: { intent: "CAPTURE" },
      });

      const customerKey = sessionQuery.data?.customer?.id ?? "guest";
      await queryClient.invalidateQueries({
        queryKey: [QK_CART.GET_CART, regionId, customerKey],
      });

      handlePostInitialization(result, selectedProviderId);
      const config = getProviderConfig(selectedProviderId);
      if (!config.handleRedirect) {
        router.push(`/medusa/store-api/cart/cart-checkout/${cartId}`);
      }
    } catch (error) {
      console.error("Failed checkout:", error);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const cartQuery = useQuery({
    queryKey: [
      QK_CART.GET_CART,
      regionId,
      sessionQuery.data?.customer?.id ?? "guest",
    ],
    queryFn: async (): Promise<StoreApiCart> => {
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
        <Alert title="Region required" variant="warning" appearance="pixel">
          Please select a region on the region page to view cart information.
        </Alert>
      </div>
    );
  }

  if (sessionQuery.isLoading || !hasHydrated) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <PixelSurface className="p-6" shadow="md">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/4 bg-stone-200" />
            <div className="h-64 bg-stone-200" />
          </div>
        </PixelSurface>
      </div>
    );
  }

  if (sessionQuery.isError) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Alert title="Session error" variant="error" appearance="pixel">
          {sessionQuery.error instanceof Error
            ? sessionQuery.error.message
            : "Could not resolve customer session"}
        </Alert>
      </div>
    );
  }

  if (cartQuery.isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <PixelSurface className="p-6" shadow="md">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/4 bg-stone-200" />
            <div className="h-64 bg-stone-200" />
          </div>
        </PixelSurface>
      </div>
    );
  }

  if (cartQuery.isError) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <Alert title="Error loading cart" variant="error" appearance="pixel">
          {cartQuery.error instanceof Error
            ? cartQuery.error.message
            : "Unknown error"}
        </Alert>
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

  const cart = cartQuery.data;
  if (!cart) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <p className="text-gray-600">No cart data available</p>
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
      <details className="group">
        <summary className="cursor-pointer font-mono text-gray-600 text-sm underline decoration-2 decoration-[#1e1b84] underline-offset-2">
          Raw cart data (debug)
        </summary>
        <PixelSurface className="mt-3 overflow-auto p-4" shadow="sm">
          <pre className="font-mono text-gray-800 text-xs">
            {JSON.stringify(cart, null, 2)}
          </pre>
        </PixelSurface>
      </details>

      <CartCreation
        cartId={cartId}
        regionId={regionId}
        isCustomerSession={isCustomerSession}
        onCreateCart={handleCreateCart}
        createCartMutation={createCartMutation}
      />

      <PageHeading
        title="Shopping cart"
        description={
          <p className="max-w-2xl text-pretty text-gray-600 text-sm leading-relaxed">
            Items marked{" "}
            <span className="font-medium text-gray-800">
              Selected for checkout
            </span>{" "}
            count toward your order. Items marked{" "}
            <span className="font-medium text-gray-800">Not in checkout</span>{" "}
            stay in your cart but are set aside: use +/− or the quantity field
            to change how many are held aside (0 removes the variant). Check
            the box on a set-aside row to move all of its units back into
            checkout. Delete removes a line entirely.
          </p>
        }
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <CartLineItem cart={cart} />
          <CartAddresses cart={cart} />
          <CartShipping cart={cart} />
        </div>

        <div className="space-y-6">
          <CartSummary
            cart={cart}
            regionId={regionId}
            checkoutMode={checkoutMode}
            onCheckoutModeChange={handleCheckoutModeChange}
            selectedProviderId={selectedProviderId}
            onSelectedProviderIdChange={setSelectedProviderId}
            onCheckout={handleCheckout}
            checkoutBusy={isCheckingOut}
          />
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
