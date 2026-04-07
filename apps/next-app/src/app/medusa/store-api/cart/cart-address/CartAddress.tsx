"use client";

import type { StoreCustomerAddress } from "@medusajs/types";
import type { StoreApiCart } from "@repo/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/app/medusa/components/Button";
import { PixelSurface } from "@/app/medusa/components/PixelSurface";
import { getMyAddresses } from "../../customer/api";
import { QK_CART, updateACart } from "../api";

const QK_CUSTOMER_ADDRESSES = [
  "store",
  "customers",
  "me",
  "addresses",
] as const;

export const CartAddresses = ({ cart }: { cart: StoreApiCart }) => {
  const queryClient = useQueryClient();
  const [showShippingSelector, setShowShippingSelector] = useState(false);
  const [showBillingSelector, setShowBillingSelector] = useState(false);

  const addressesQuery = useQuery({
    queryKey: QK_CUSTOMER_ADDRESSES,
    queryFn: async () => {
      try {
        const { addresses } = await getMyAddresses();
        return addresses ?? [];
      } catch (e: unknown) {
        const code = (e as { code?: string })?.code;
        if (code === "AUTH.UNAUTHORIZED") {
          return [];
        }
        throw e;
      }
    },
    retry: false,
  });

  const customerAddresses = addressesQuery.data ?? [];

  const updateAddressMutation = useMutation({
    mutationFn: async ({
      address,
      type,
    }: {
      address: StoreCustomerAddress;
      type: "shipping" | "billing";
    }) => {
      const updates = {
        [type === "shipping" ? "shipping_address" : "billing_address"]: {
          first_name: address.first_name,
          last_name: address.last_name,
          company: address.company,
          address_1: address.address_1,
          address_2: address.address_2,
          city: address.city,
          province: address.province,
          postal_code: address.postal_code,
          country_code: address.country_code,
          phone: address.phone,
        },
      };
      return updateACart(cart.id, updates);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QK_CART.GET_CART] });
      if (variables.type === "shipping") {
        setShowShippingSelector(false);
      } else {
        setShowBillingSelector(false);
      }
    },
    onError: (error, variables) => {
      console.error(`Failed to update ${variables.type} address:`, error);
    },
  });

  const handleAddressSelection = (
    address: StoreCustomerAddress,
    type: "shipping" | "billing",
  ) => {
    updateAddressMutation.mutate({ address, type });
  };

  const isLoading = addressesQuery.isLoading;
  const isUpdating = updateAddressMutation.isPending;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-bold text-gray-900 text-lg">Shipping address</h3>
          <Button
            type="button"
            variant="outline"
            size="compact"
            fullWidth={false}
            onClick={() => setShowShippingSelector(!showShippingSelector)}
            disabled={isLoading || isUpdating || customerAddresses.length === 0}
          >
            {showShippingSelector ? "Cancel" : "Change"}
          </Button>
        </div>

        {showShippingSelector ? (
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {customerAddresses.map((address) => (
              <PixelSurface
                key={address.id}
                shadow="sm"
                className={`p-3 transition-colors ${isUpdating ? "cursor-wait opacity-70" : "cursor-pointer hover:bg-stone-50"}`}
                onClick={() => {
                  if (!isUpdating) handleAddressSelection(address, "shipping");
                }}
                onKeyDown={(e) => {
                  if (isUpdating) return;
                  if (e.key === "Enter" || e.key === " ") {
                    handleAddressSelection(address, "shipping");
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">
                    {address.first_name} {address.last_name}
                  </p>
                  {address.company && (
                    <p className="text-gray-800">{address.company}</p>
                  )}
                  <p className="text-gray-800">{address.address_1}</p>
                  {address.address_2 && (
                    <p className="text-gray-800">{address.address_2}</p>
                  )}
                  <p className="text-gray-800">
                    {address.city}, {address.province} {address.postal_code}
                  </p>
                  <p className="text-gray-800">
                    {address.country_code?.toUpperCase()}
                  </p>
                </div>
              </PixelSurface>
            ))}
          </div>
        ) : cart.shipping_address ? (
          <div className="space-y-1 text-gray-800 text-sm">
            {cart.shipping_address.first_name && (
              <p>
                {cart.shipping_address.first_name}{" "}
                {cart.shipping_address.last_name}
              </p>
            )}
            {cart.shipping_address.company && (
              <p>{cart.shipping_address.company}</p>
            )}
            {cart.shipping_address.address_1 && (
              <p>{cart.shipping_address.address_1}</p>
            )}
            {cart.shipping_address.address_2 && (
              <p>{cart.shipping_address.address_2}</p>
            )}
            <p>
              {cart.shipping_address.city && `${cart.shipping_address.city}, `}
              {cart.shipping_address.province}{" "}
              {cart.shipping_address.postal_code}
            </p>
            {cart.shipping_address.country_code && (
              <p>{cart.shipping_address.country_code.toUpperCase()}</p>
            )}
            {cart.shipping_address.phone && (
              <p>Phone: {cart.shipping_address.phone}</p>
            )}
          </div>
        ) : (
          <p className="text-gray-600">No shipping address set</p>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-bold text-gray-900 text-lg">Billing address</h3>
          <Button
            type="button"
            variant="outline"
            size="compact"
            fullWidth={false}
            onClick={() => setShowBillingSelector(!showBillingSelector)}
            disabled={isLoading || isUpdating || customerAddresses.length === 0}
          >
            {showBillingSelector ? "Cancel" : "Change"}
          </Button>
        </div>

        {showBillingSelector ? (
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {customerAddresses.map((address) => (
              <PixelSurface
                key={address.id}
                shadow="sm"
                className={`p-3 transition-colors ${isUpdating ? "cursor-wait opacity-70" : "cursor-pointer hover:bg-stone-50"}`}
                onClick={() => {
                  if (!isUpdating) handleAddressSelection(address, "billing");
                }}
                onKeyDown={(e) => {
                  if (isUpdating) return;
                  if (e.key === "Enter" || e.key === " ") {
                    handleAddressSelection(address, "billing");
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">
                    {address.first_name} {address.last_name}
                  </p>
                  {address.company && (
                    <p className="text-gray-800">{address.company}</p>
                  )}
                  <p className="text-gray-800">{address.address_1}</p>
                  {address.address_2 && (
                    <p className="text-gray-800">{address.address_2}</p>
                  )}
                  <p className="text-gray-800">
                    {address.city}, {address.province} {address.postal_code}
                  </p>
                  <p className="text-gray-800">
                    {address.country_code?.toUpperCase()}
                  </p>
                </div>
              </PixelSurface>
            ))}
          </div>
        ) : cart.billing_address ? (
          <div className="space-y-1 text-gray-800 text-sm">
            {cart.billing_address.first_name && (
              <p>
                {cart.billing_address.first_name}{" "}
                {cart.billing_address.last_name}
              </p>
            )}
            {cart.billing_address.company && (
              <p>{cart.billing_address.company}</p>
            )}
            {cart.billing_address.address_1 && (
              <p>{cart.billing_address.address_1}</p>
            )}
            {cart.billing_address.address_2 && (
              <p>{cart.billing_address.address_2}</p>
            )}
            <p>
              {cart.billing_address.city && `${cart.billing_address.city}, `}
              {cart.billing_address.province} {cart.billing_address.postal_code}
            </p>
            {cart.billing_address.country_code && (
              <p>{cart.billing_address.country_code.toUpperCase()}</p>
            )}
            {cart.billing_address.phone && (
              <p>Phone: {cart.billing_address.phone}</p>
            )}
          </div>
        ) : (
          <p className="text-gray-600">No billing address set</p>
        )}
      </div>
    </div>
  );
};
