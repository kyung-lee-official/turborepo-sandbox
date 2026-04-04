"use client";

import type { StoreCart } from "@medusajs/types";
import type { CartDisplayLine } from "@repo/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useMIdStore } from "@/stores/medusa/medusa-entity-id";
import {
  QK_CART,
  removeLineItem,
  selectLineItem,
  unselectLineItem,
  updateLineItem,
} from "../api";
import { SelectedCartLineRow } from "./SelectedCartLineRow";
import {
  UnselectedCartLineRow,
  type UnselectedLineSnapshot,
} from "./UnselectedCartLineRow";

type StoreCartLine = NonNullable<StoreCart["items"]>[number];

type CartWithDisplayLines = StoreCart & {
  display_lines?: CartDisplayLine[];
};

type UpdateLineVars = {
  cartId: string;
  lineItemId: string;
  quantity: number;
};

type RemoveLineVars = { cartId: string; lineItemId: string };

export const CartLineItem = ({ cart }: { cart: StoreCart }) => {
  const queryClient = useQueryClient();
  const cartId = useMIdStore((state) => state.cartId);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [pendingSelectionItemId, setPendingSelectionItemId] = useState<
    string | null
  >(null);
  const [pendingSelectVariantId, setPendingSelectVariantId] = useState<
    string | null
  >(null);

  const removeLineItemMutation = useMutation({
    mutationFn: ({ cartId: cid, lineItemId }: RemoveLineVars) =>
      removeLineItem(cid, lineItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QK_CART.GET_CART],
      });
    },
    onError: (error) => {
      console.error("Failed to remove line item:", error);
    },
  });

  const updateLineItemMutation = useMutation({
    mutationFn: ({ cartId: cid, lineItemId, quantity }: UpdateLineVars) =>
      updateLineItem(cid, lineItemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QK_CART.GET_CART],
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
    onMutate: async ({ itemId }) => {
      setPendingSelectionItemId(itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QK_CART.GET_CART],
      });
    },
    onSettled: () => {
      setPendingSelectionItemId(null);
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
    onMutate: async ({ variantId }) => {
      setPendingSelectVariantId(variantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QK_CART.GET_CART],
      });
    },
    onSettled: () => {
      setPendingSelectVariantId(null);
    },
    onError: (error) => {
      console.error("Failed to add unselected line to checkout:", error);
    },
  });

  const unselectedMap = ((cart.metadata as Record<string, unknown>)
    ?.unselected ?? {}) as Record<string, UnselectedLineSnapshot>;
  const unselectedItems = Object.entries(unselectedMap).map(
    ([variantId, details]) => ({
      variantId,
      ...details,
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

  const isLineUpdating = (lineItemId: string) =>
    updateLineItemMutation.isPending &&
    updateLineItemMutation.variables?.lineItemId === lineItemId;

  const isLineRemoving = (lineItemId: string) =>
    removeLineItemMutation.isPending &&
    removeLineItemMutation.variables?.lineItemId === lineItemId;

  const allItems = cart.items || [];
  const displayLines = (cart as CartWithDisplayLines).display_lines;
  const useDisplayLines = Boolean(displayLines?.length);
  const hasVisibleItems = useDisplayLines
    ? (displayLines?.length ?? 0) > 0
    : allItems.length > 0 || unselectedItems.length > 0;
  const visibleCount = useDisplayLines
    ? (displayLines?.length ?? 0)
    : allItems.length + unselectedItems.length;

  const renderSelectedRow = (item: StoreCartLine) => {
    const qty = getCurrentQuantity(item.id, item.quantity);
    const updating = isLineUpdating(item.id);
    const removing = isLineRemoving(item.id);

    return (
      <SelectedCartLineRow
        key={item.id}
        cart={cart}
        item={item}
        isSelectionPending={pendingSelectionItemId === item.id}
        isUpdatingLine={updating}
        isRemovingLine={removing}
        displayQuantity={qty}
        disableMinus={updating || qty <= 1}
        onToggleUnselect={() => {
          toggleItemSelectionMutation.mutate({
            itemId: item.id,
            select: false,
          });
        }}
        onDecrement={() => updateQuantity(item.id, qty - 1)}
        onIncrement={() => updateQuantity(item.id, qty + 1)}
        onQuantityChange={(v) => handleQuantityChange(item.id, v)}
        onQuantityBlur={() => handleQuantityBlur(item.id)}
        onRemove={() => handleRemoveItem(item.id)}
      />
    );
  };

  const renderUnselectedRow = (
    variantId: string,
    line: UnselectedLineSnapshot,
  ) => (
    <UnselectedCartLineRow
      key={variantId}
      currencyCode={cart.currency_code}
      variantId={variantId}
      line={line}
      isSelectPending={pendingSelectVariantId === variantId}
      onSelect={() => selectLineItemMutation.mutate({ variantId })}
    />
  );

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-800 text-xl">
        Cart items ({visibleCount})
      </h3>
      {hasVisibleItems ? (
        <div className="space-y-4">
          {useDisplayLines && displayLines
            ? displayLines.map((line) => {
                if (line.kind === "line_item") {
                  const item = line.item as unknown as StoreCartLine;
                  return renderSelectedRow(item);
                }
                const { kind: _k, variant_id, ...snap } = line;
                return renderUnselectedRow(variant_id, snap);
              })
            : null}
          {!useDisplayLines ? (
            <>
              {allItems.map((item) => renderSelectedRow(item))}
              {unselectedItems.map(({ variantId, ...rest }) =>
                renderUnselectedRow(variantId, rest),
              )}
            </>
          ) : null}
        </div>
      ) : (
        <p className="py-8 text-center text-gray-600">Your cart is empty</p>
      )}
    </div>
  );
};
