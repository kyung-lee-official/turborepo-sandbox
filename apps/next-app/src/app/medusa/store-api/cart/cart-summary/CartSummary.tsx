"use client";

import type { StoreCart } from "@medusajs/types";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "@/app/medusa/components/Alert";
import { Button } from "@/app/medusa/components/Button";
import { Card } from "@/app/medusa/components/Card";
import { formatCurrency } from "@/utils/currency";
import { listPaymentProviders } from "../../payment/api";

export type CheckoutFlowMode = "one-step" | "two-step";

export const CartSummary = ({
  cart,
  regionId,
  checkoutMode,
  onCheckoutModeChange,
  selectedProviderId,
  onSelectedProviderIdChange,
  onCheckout,
  checkoutBusy = false,
}: {
  cart: StoreCart;
  regionId: string;
  checkoutMode: CheckoutFlowMode;
  onCheckoutModeChange: (mode: CheckoutFlowMode) => void;
  selectedProviderId: string;
  onSelectedProviderIdChange: (id: string) => void;
  onCheckout: () => void;
  checkoutBusy?: boolean;
}) => {
  const providersQuery = useQuery({
    queryKey: ["payment-providers", regionId],
    queryFn: () => listPaymentProviders(regionId),
    enabled: checkoutMode === "one-step" && Boolean(regionId),
  });

  const baseCanCheckout =
    Boolean(cart.shipping_address) &&
    Boolean(cart.shipping_methods?.length) &&
    Boolean(cart.items?.length);

  const oneStepReady =
    checkoutMode === "two-step" ||
    (Boolean(selectedProviderId) &&
      !providersQuery.isLoading &&
      !providersQuery.isError);

  const canCheckout = baseCanCheckout && oneStepReady;

  return (
    <Card variant="pixel" className="max-w-none bg-stone-50">
      <h3 className="font-bold text-gray-900 text-xl">Cart summary</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-gray-700">Subtotal</span>
          <span className="font-semibold text-gray-900">
            {formatCurrency(cart.subtotal, cart.currency_code)}
          </span>
        </div>
        {cart.tax_total > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-700">Tax</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(cart.tax_total, cart.currency_code)}
            </span>
          </div>
        )}
        {cart.shipping_total > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-700">Shipping</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(cart.shipping_total, cart.currency_code)}
            </span>
          </div>
        )}
        {cart.discount_total > 0 && (
          <div className="flex justify-between gap-4 text-green-700">
            <span>Discount</span>
            <span className="font-semibold">
              -{formatCurrency(cart.discount_total, cart.currency_code)}
            </span>
          </div>
        )}
        <div className="flex justify-between gap-4 border-t-2 border-[#1e1b84] pt-3 font-bold text-base text-gray-900">
          <span>Total</span>
          <span>{formatCurrency(cart.total, cart.currency_code)}</span>
        </div>
      </div>

      <div className="space-y-3 border-t-2 border-stone-200 pt-4">
        <div>
          <label
            htmlFor="checkout-flow"
            className="mb-2 block font-semibold text-gray-800 text-sm"
          >
            Checkout flow
          </label>
          <select
            id="checkout-flow"
            value={checkoutMode}
            onChange={(e) =>
              onCheckoutModeChange(e.target.value as CheckoutFlowMode)
            }
            className="w-full rounded-none border-2 border-[#1e1b84] bg-white px-3 py-2 font-sans text-sm text-gray-900 shadow-[4px_4px_0_0_#0f172a] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={checkoutBusy}
          >
            <option value="one-step">One-step (merged API)</option>
            <option value="two-step">Two-step (collection then session)</option>
          </select>
        </div>

        {checkoutMode === "one-step" && (
          <div>
            <label
              htmlFor="cart-payment-provider"
              className="mb-2 block font-semibold text-gray-800 text-sm"
            >
              Payment provider
            </label>
            {providersQuery.isLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 w-1/4 bg-stone-200" />
                <div className="h-10 bg-stone-200" />
              </div>
            ) : providersQuery.isError ? (
              <Alert title="Providers" variant="error" appearance="pixel">
                Failed to load payment providers.
              </Alert>
            ) : (
              <select
                id="cart-payment-provider"
                value={selectedProviderId}
                onChange={(e) => onSelectedProviderIdChange(e.target.value)}
                className="w-full rounded-none border-2 border-[#1e1b84] bg-white px-3 py-2 font-sans text-sm text-gray-900 shadow-[4px_4px_0_0_#0f172a] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={checkoutBusy}
              >
                <option value="">Select a payment provider</option>
                {providersQuery.data?.payment_providers.map(
                  (provider: { id: string; display_name?: string }) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.id}
                      {provider.display_name ? ` — ${provider.display_name}` : ""}
                    </option>
                  ),
                )}
              </select>
            )}
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="primary"
        className="mt-4"
        disabled={!canCheckout || checkoutBusy}
        onClick={onCheckout}
      >
        {checkoutBusy ? "Starting checkout…" : "Proceed to checkout"}
      </Button>
      {!baseCanCheckout && (
        <p className="text-center text-gray-600 text-sm">
          {!cart.items?.length
            ? "Select items to checkout"
            : "Add shipping address and a shipping method"}
        </p>
      )}
      {baseCanCheckout &&
        checkoutMode === "one-step" &&
        !providersQuery.isLoading &&
        !providersQuery.isError &&
        !selectedProviderId && (
          <p className="text-center text-gray-600 text-sm">
            Select a payment provider to continue
          </p>
        )}
    </Card>
  );
};
