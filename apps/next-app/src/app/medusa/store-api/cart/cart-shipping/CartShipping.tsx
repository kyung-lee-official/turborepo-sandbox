"use client";

import type { StoreApiCart } from "@repo/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/app/medusa/components/Button";
import { PixelSurface } from "@/app/medusa/components/PixelSurface";
import { formatCurrency } from "@/utils/currency";
import { getShippingOptions } from "../../shipping-option/api";
import { QK_CART, updateCartShippingMethod } from "../api";

type ShippingOption = {
  id: string;
  name: string;
  amount: number;
  description?: string;
};

function shippingAddressQueryKeySegment(cart: StoreApiCart) {
  const a = cart.shipping_address;
  if (!a) return "none";
  const joined =
    [a.address_1, a.postal_code, a.country_code].filter(Boolean).join("|") ||
    "addr";
  return a.id ?? joined;
}

export const CartShipping = ({ cart }: { cart: StoreApiCart }) => {
  const queryClient = useQueryClient();
  const [showShippingSelector, setShowShippingSelector] = useState(false);

  const addressKey = useMemo(
    () => shippingAddressQueryKeySegment(cart),
    [cart],
  );

  const shippingOptionsQuery = useQuery({
    queryKey: ["store", "shipping-options", cart.id, addressKey] as const,
    queryFn: async () => {
      const response = await getShippingOptions(cart.id);
      return (response.shipping_options ?? []) as ShippingOption[];
    },
    enabled: !!cart.shipping_address,
  });

  const shippingOptions = shippingOptionsQuery.data ?? [];

  const updateShippingMethodMutation = useMutation({
    mutationFn: (optionId: string) =>
      updateCartShippingMethod(cart.id, optionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QK_CART.GET_CART] });
      setShowShippingSelector(false);
    },
    onError: (error) => {
      console.error("Failed to update shipping method:", error);
    },
  });

  const handleShippingMethodSelection = (option: ShippingOption) => {
    updateShippingMethodMutation.mutate(option.id);
  };

  const isLoadingOptions = shippingOptionsQuery.isLoading;
  const isUpdating = updateShippingMethodMutation.isPending;

  if (!cart.shipping_address) {
    return (
      <div>
        <h3 className="mb-3 font-bold text-gray-900 text-lg">
          Shipping methods
        </h3>
        <p className="text-gray-600">Select a shipping address first</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-bold text-gray-900 text-lg">Shipping methods</h3>
        <Button
          type="button"
          variant="outline"
          size="compact"
          fullWidth={false}
          onClick={() => setShowShippingSelector(!showShippingSelector)}
          disabled={
            isLoadingOptions || isUpdating || shippingOptions.length === 0
          }
        >
          {showShippingSelector ? "Cancel" : "Change"}
        </Button>
      </div>

      {showShippingSelector ? (
        <div className="max-h-60 space-y-2 overflow-y-auto">
          {shippingOptions.map((option) => (
            <PixelSurface
              key={option.id}
              shadow="sm"
              className={`p-3 transition-colors ${isUpdating ? "cursor-wait opacity-70" : "cursor-pointer hover:bg-stone-50"}`}
              onClick={() => {
                if (!isUpdating) handleShippingMethodSelection(option);
              }}
              onKeyDown={(e) => {
                if (isUpdating) return;
                if (e.key === "Enter" || e.key === " ") {
                  handleShippingMethodSelection(option);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900">{option.name}</h4>
                  {option.description && (
                    <p className="text-gray-600 text-sm">
                      {option.description}
                    </p>
                  )}
                </div>
                <p className="shrink-0 font-semibold text-gray-900">
                  {formatCurrency(option.amount, cart.currency_code)}
                </p>
              </div>
            </PixelSurface>
          ))}
        </div>
      ) : cart.shipping_methods && cart.shipping_methods.length > 0 ? (
        <div className="space-y-3">
          {cart.shipping_methods.map((method) => (
            <PixelSurface key={method.id} shadow="sm" className="p-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900">{method.name}</h4>
                  {method.description && (
                    <p className="text-gray-600 text-sm">
                      {method.description}
                    </p>
                  )}
                </div>
                <p className="shrink-0 font-semibold text-gray-900">
                  {formatCurrency(method.amount, cart.currency_code)}
                </p>
              </div>
            </PixelSurface>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">No shipping methods selected</p>
      )}
    </div>
  );
};
