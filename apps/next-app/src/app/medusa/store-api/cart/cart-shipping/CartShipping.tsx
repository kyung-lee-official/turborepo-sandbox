"use client";

import type { StoreCart } from "@medusajs/types";
import { useEffect, useState } from "react";
import { Button } from "@/app/medusa/components/Button";
import { PixelSurface } from "@/app/medusa/components/PixelSurface";
import { formatCurrency } from "@/utils/currency";
import { getShippingOptions } from "../../shipping-option/api";
import { updateCartShippingMethod } from "../api";

type ShippingOption = {
  id: string;
  name: string;
  amount: number;
  description?: string;
};

export const CartShipping = ({ cart }: { cart: StoreCart }) => {
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showShippingSelector, setShowShippingSelector] = useState(false);

  useEffect(() => {
    const fetchShippingOptions = async () => {
      try {
        setIsLoading(true);
        if (!cart.shipping_address) {
          setShippingOptions([]);
          return;
        }

        const response = await getShippingOptions(cart.id);
        setShippingOptions(response.shipping_options || []);
      } catch (error) {
        console.error("Failed to fetch shipping options:", error);
        setShippingOptions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShippingOptions();
  }, [cart.shipping_address, cart.id]);

  const handleShippingMethodSelection = async (option: ShippingOption) => {
    try {
      await updateCartShippingMethod(cart.id, option.id);
      setShowShippingSelector(false);

      window.location.reload();
    } catch (error) {
      console.error("Failed to update shipping method:", error);
    }
  };

  if (!cart.shipping_address) {
    return (
      <div>
        <h3 className="mb-3 font-bold text-gray-900 text-lg">Shipping methods</h3>
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
          disabled={isLoading || shippingOptions.length === 0}
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
              className="cursor-pointer p-3 transition-colors hover:bg-stone-50"
              onClick={() => handleShippingMethodSelection(option)}
              onKeyDown={(e) => {
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
                    <p className="text-gray-600 text-sm">{option.description}</p>
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
                    <p className="text-gray-600 text-sm">{method.description}</p>
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
