"use client";

import type { StoreCart, StoreCustomerAddress } from "@medusajs/types";
import { useEffect, useState } from "react";
import { Button } from "@/app/medusa/components/Button";
import { PixelSurface } from "@/app/medusa/components/PixelSurface";
import { getMyAddresses } from "../../customer/api";
import { updateACart } from "../api";

export const CartAddresses = ({ cart }: { cart: StoreCart }) => {
  const [customerAddresses, setCustomerAddresses] = useState<
    StoreCustomerAddress[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showShippingSelector, setShowShippingSelector] = useState(false);
  const [showBillingSelector, setShowBillingSelector] = useState(false);

  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        setIsLoading(true);
        const { addresses } = await getMyAddresses();

        setCustomerAddresses(addresses || []);
      } catch (error) {
        console.error("Failed to fetch customer addresses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAddresses();
  }, []);

  const handleAddressSelection = async (
    address: StoreCustomerAddress,
    type: "shipping" | "billing",
  ) => {
    try {
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

      await updateACart(cart.id, updates);

      if (type === "shipping") {
        setShowShippingSelector(false);
      } else {
        setShowBillingSelector(false);
      }

      window.location.reload();
    } catch (error) {
      console.error(`Failed to update ${type} address:`, error);
    }
  };

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
            disabled={isLoading || customerAddresses.length === 0}
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
                className="cursor-pointer p-3 transition-colors hover:bg-stone-50"
                onClick={() => handleAddressSelection(address, "shipping")}
                onKeyDown={(e) => {
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
                  {address.company && <p className="text-gray-800">{address.company}</p>}
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
            disabled={isLoading || customerAddresses.length === 0}
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
                className="cursor-pointer p-3 transition-colors hover:bg-stone-50"
                onClick={() => handleAddressSelection(address, "billing")}
                onKeyDown={(e) => {
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
                  {address.company && <p className="text-gray-800">{address.company}</p>}
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
