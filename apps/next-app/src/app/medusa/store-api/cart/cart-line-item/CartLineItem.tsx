"use client";

import type { StoreCart } from "@medusajs/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useState } from "react";
import { useMIdStore } from "@/stores/medusa/medusa-entity-id";
import { formatCurrency } from "@/utils/currency";
import {
  QK_CART,
  removeLineItem,
  selectLineItem,
  unselectLineItem,
  updateLineItem,
} from "../api";

export const CartLineItem = ({ cart }: { cart: StoreCart }) => {
  const queryClient = useQueryClient();
  const cartId = useMIdStore((state) => state.cartId);
  const regionId = useMIdStore((state) => state.regionId);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const removeLineItemMutation = useMutation({
    mutationFn: ({
      cartId,
      lineItemId,
    }: {
      cartId: string;
      lineItemId: string;
    }) => removeLineItem(cartId, lineItemId),
    onSuccess: () => {
      // Invalidate and refetch cart data after successful deletion
      queryClient.invalidateQueries({
        queryKey: [QK_CART.GET_CART, cartId, regionId],
      });
    },
    onError: (error) => {
      console.error("Failed to remove line item:", error);
    },
  });

  const updateLineItemMutation = useMutation({
    mutationFn: ({
      cartId,
      lineItemId,
      quantity,
    }: {
      cartId: string;
      lineItemId: string;
      quantity: number;
    }) => updateLineItem(cartId, lineItemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QK_CART.GET_CART, cartId, regionId],
      });
    },
    onError: (error) => {
      console.error("Failed to update line item:", error);
    },
  });

  const toggleItemSelectionMutation = useMutation({
    mutationFn: ({ itemId, select }: { itemId: string; select: boolean }) => {
      if (!cartId) throw new Error("Cart ID is required");

      if (!select) {
        return unselectLineItem(cartId, itemId);
      }
      throw new Error("Selecting existing line items is not supported");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QK_CART.GET_CART, cartId, regionId],
      });
    },
    onError: (error) => {
      console.error("Failed to update cart metadata:", error);
    },
  });

  const selectLineItemMutation = useMutation({
    mutationFn: ({ variantId }: { variantId: string }) => {
      if (!cartId) throw new Error("Cart ID is required");
      return selectLineItem(cartId, variantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QK_CART.GET_CART, cartId, regionId],
      });
    },
    onError: (error) => {
      console.error("Failed to bring back unselected item:", error);
    },
  });

  const unselectedMap = ((cart.metadata as Record<string, unknown>)
    ?.unselected ?? {}) as Record<string, { quantity?: number }>;
  const unselectedItems = Object.entries(unselectedMap).map(
    ([variantId, details]) => ({
      variantId,
      quantity: details.quantity ?? 0,
    }),
  );

  const handleRemoveItem = (lineItemId: string) => {
    if (!cartId) return;
    removeLineItemMutation.mutate({ cartId, lineItemId });
  };

  const getCurrentQuantity = (itemId: string, defaultQuantity: number) => {
    return quantities[itemId] !== undefined
      ? quantities[itemId]
      : defaultQuantity;
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setQuantities((prev) => ({ ...prev, [itemId]: newQuantity }));
    if (cartId) {
      updateLineItemMutation.mutate({
        cartId,
        lineItemId: itemId,
        quantity: newQuantity,
      });
    }
  };

  const handleQuantityChange = (itemId: string, value: string) => {
    const newQuantity = parseInt(value, 10);
    if (!Number.isNaN(newQuantity) && newQuantity >= 1) {
      setQuantities((prev) => ({ ...prev, [itemId]: newQuantity }));
    }
  };

  const handleQuantityBlur = (itemId: string) => {
    const currentQuantity = quantities[itemId];
    if (currentQuantity !== undefined && cartId) {
      updateLineItemMutation.mutate({
        cartId,
        lineItemId: itemId,
        quantity: currentQuantity,
      });
    }
  };

  const allItems = cart.items || [];
  const hasVisibleItems = allItems.length > 0 || unselectedItems.length > 0;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-xl">
        Cart Items ({allItems.length + unselectedItems.length})
      </h3>
      {hasVisibleItems ? (
        <div className="space-y-4">
          {allItems.map((item) => {
            const isSelected = true;
            return (
              <div key={item.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          toggleItemSelectionMutation.mutate({
                            itemId: item.id,
                            select: !isSelected,
                          });
                        }}
                        disabled={toggleItemSelectionMutation.isPending}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label className="font-medium text-gray-700 text-sm">
                        {isSelected ? "Selected for checkout" : "Not selected"}
                      </label>
                    </div>
                    <h4 className="font-medium">{item.title}</h4>
                    {item.subtitle && (
                      <p className="text-gray-600 text-sm">{item.subtitle}</p>
                    )}
                    {item.variant_title && (
                      <p className="text-gray-500 text-sm">
                        Variant: {item.variant_title}
                      </p>
                    )}
                    <p className="mt-1 font-medium text-gray-700 text-sm">
                      {formatCurrency(item.unit_price, cart.currency_code)}
                    </p>
                    {item.variant_sku && (
                      <p className="text-gray-400 text-xs">
                        SKU: {item.variant_sku}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2 text-right">
                    {isSelected ? (
                      <>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                getCurrentQuantity(item.id, item.quantity) - 1,
                              )
                            }
                            disabled={
                              updateLineItemMutation.isPending ||
                              getCurrentQuantity(item.id, item.quantity) <= 1
                            }
                            className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={getCurrentQuantity(item.id, item.quantity)}
                            onChange={(e) =>
                              handleQuantityChange(item.id, e.target.value)
                            }
                            onBlur={() => handleQuantityBlur(item.id)}
                            className="w-16 rounded border border-gray-300 px-2 py-1 text-center"
                          />
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                getCurrentQuantity(item.id, item.quantity) + 1,
                              )
                            }
                            disabled={updateLineItemMutation.isPending}
                            className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={removeLineItemMutation.isPending}
                          className="rounded bg-red-500 px-3 py-1 text-white text-xs hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-gray-400"
                        >
                          {removeLineItemMutation.isPending
                            ? "Removing..."
                            : "Delete"}
                        </button>
                      </>
                    ) : (
                      <div className="text-gray-500 text-sm">
                        Quantity: {item.quantity}
                      </div>
                    )}
                  </div>
                </div>
                {item.thumbnail && (
                  <Image
                    width={300}
                    height={300}
                    src={item.thumbnail}
                    alt={item.title}
                    className="mt-2 h-16 w-16 rounded object-cover"
                  />
                )}
              </div>
            );
          })}

          {unselectedItems.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                Unselected Items ({unselectedItems.length})
              </h4>
              {unselectedItems.map((item) => (
                <div
                  key={item.variantId}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-700 text-sm">
                        Variant ID
                      </p>
                      <p className="font-mono text-gray-500 text-xs">
                        {item.variantId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-700 text-sm">
                        Quantity: {item.quantity}
                      </p>
                      <p className="text-gray-500 text-xs">Not selected</p>
                      <button
                        type="button"
                        onClick={() =>
                          selectLineItemMutation.mutate({
                            variantId: item.variantId,
                          })
                        }
                        disabled={selectLineItemMutation.isPending}
                        className="mt-2 rounded bg-blue-600 px-3 py-1 font-medium text-white text-xs hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                      >
                        {selectLineItemMutation.isPending
                          ? "Bringing back..."
                          : "Bring back"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="py-8 text-center text-gray-500">Your cart is empty</p>
      )}
    </div>
  );
};
