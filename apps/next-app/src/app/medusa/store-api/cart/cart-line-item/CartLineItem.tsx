"use client";

import type { StoreApiCart, StoreApiCartLineItem } from "@repo/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useMIdStore } from "@/stores/medusa/medusa-entity-id";
import {
  QK_CART,
  removeLineItem,
  setVariantQuantity,
  unselectLineItem,
  updateLineItem,
} from "../api";
import { SelectedCartLineRow } from "./SelectedCartLineRow";
import {
  UnselectedCartLineRow,
  type UnselectedLineSnapshot,
} from "./UnselectedCartLineRow";

type UpdateLineVars = {
  cartId: string;
  lineItemId: string;
  quantity: number;
};

type RemoveLineVars = { cartId: string; lineItemId: string };

type SetVariantVars = { cartId: string; variantId: string; quantity: number };

const unselectedKey = (variantId: string) => `u:${variantId}`;

export const CartLineItem = ({ cart }: { cart: StoreApiCart }) => {
  const queryClient = useQueryClient();
  const cartId = useMIdStore((state) => state.cartId);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [pendingSelectionItemId, setPendingSelectionItemId] = useState<
    string | null
  >(null);
  const [pendingVariantId, setPendingVariantId] = useState<string | null>(
    null,
  );

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

  const setVariantQuantityMutation = useMutation({
    mutationFn: ({ cartId: cid, variantId, quantity }: SetVariantVars) =>
      setVariantQuantity(cid, variantId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QK_CART.GET_CART],
      });
    },
    onError: (error) => {
      console.error("Failed to set variant quantity:", error);
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

  const unselectedMap = cart.metadata?.unselected ?? {};
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

  const getUnselectedDisplayQty = (variantId: string, defaultQuantity: number) => {
    const k = unselectedKey(variantId);
    return quantities[k] !== undefined ? quantities[k] : defaultQuantity;
  };

  const clearUnselectedLocal = (variantId: string) => {
    const k = unselectedKey(variantId);
    setQuantities((prev) => {
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 0 || !cartId) return;
    if (newQuantity === 0) {
      setQuantities((prev) => ({ ...prev, [itemId]: 0 }));
      updateLineItemMutation.mutate({
        cartId,
        lineItemId: itemId,
        quantity: 0,
      });
      return;
    }
    setQuantities((prev) => ({ ...prev, [itemId]: newQuantity }));
    updateLineItemMutation.mutate({
      cartId,
      lineItemId: itemId,
      quantity: newQuantity,
    });
  };

  const handleQuantityChange = (itemId: string, value: string) => {
    const newQuantity = parseInt(value, 10);
    if (!Number.isNaN(newQuantity) && newQuantity >= 0) {
      setQuantities((prev) => ({ ...prev, [itemId]: newQuantity }));
    }
  };

  const handleQuantityBlur = (itemId: string) => {
    const currentQuantity = quantities[itemId];
    if (currentQuantity === undefined || !cartId) return;
    if (currentQuantity <= 0) {
      updateLineItemMutation.mutate({
        cartId,
        lineItemId: itemId,
        quantity: 0,
      });
      setQuantities((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      return;
    }
    updateLineItemMutation.mutate({
      cartId,
      lineItemId: itemId,
      quantity: currentQuantity,
    });
  };

  const handleUnselectedQuantityChange = (variantId: string, value: string) => {
    const n = parseInt(value, 10);
    if (!Number.isNaN(n) && n >= 0) {
      setQuantities((prev) => ({
        ...prev,
        [unselectedKey(variantId)]: n,
      }));
    }
  };

  const handleUnselectedQuantityBlur = (
    variantId: string,
    serverQty: number,
  ) => {
    const k = unselectedKey(variantId);
    const raw = quantities[k];
    if (raw === undefined || !cartId) return;

    let n = Math.floor(raw);
    if (Number.isNaN(n) || n < 0) {
      clearUnselectedLocal(variantId);
      return;
    }
    // Same as server snapshot and no pending local edit to persist — skip API.
    // (Do not cap n to serverQty: increasing quantity must call setVariantQuantity,
    // same as the '+' control.)
    if (n === serverQty) {
      clearUnselectedLocal(variantId);
      return;
    }

    setPendingVariantId(variantId);
    setVariantQuantityMutation.mutate(
      { cartId, variantId, quantity: n },
      {
        onSettled: () => {
          setPendingVariantId(null);
          clearUnselectedLocal(variantId);
        },
      },
    );
  };

  const isLineUpdating = (lineItemId: string) =>
    updateLineItemMutation.isPending &&
    updateLineItemMutation.variables?.lineItemId === lineItemId;

  const isLineRemoving = (lineItemId: string) =>
    removeLineItemMutation.isPending &&
    removeLineItemMutation.variables?.lineItemId === lineItemId;

  const isVariantPending = (variantId: string) =>
    setVariantQuantityMutation.isPending &&
    setVariantQuantityMutation.variables?.variantId === variantId;

  const isVariantRemoving = (variantId: string) =>
    setVariantQuantityMutation.isPending &&
    setVariantQuantityMutation.variables?.variantId === variantId &&
    setVariantQuantityMutation.variables?.quantity === 0;

  const allItems = cart.items || [];
  const displayLines = cart.display_lines;
  const useDisplayLines = displayLines.length > 0;
  const hasVisibleItems = useDisplayLines
    ? displayLines.length > 0
    : allItems.length > 0 || unselectedItems.length > 0;
  const visibleCount = useDisplayLines
    ? displayLines.length
    : allItems.length + unselectedItems.length;

  const renderSelectedRow = (item: StoreApiCartLineItem) => {
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
        disableMinus={updating || qty < 1}
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
  ) => {
    const displayQty = getUnselectedDisplayQty(variantId, line.quantity);
    const pending =
      pendingVariantId === variantId || isVariantPending(variantId);
    const removing = isVariantRemoving(variantId);

    const mutateVariant = (quantity: number) => {
      if (!cartId) return;
      setPendingVariantId(variantId);
      setVariantQuantityMutation.mutate(
        { cartId, variantId, quantity },
        {
          onSettled: () => {
            setPendingVariantId(null);
            clearUnselectedLocal(variantId);
          },
        },
      );
    };

    return (
      <UnselectedCartLineRow
        key={variantId}
        currencyCode={cart.currency_code}
        variantId={variantId}
        line={line}
        isQuantityPending={pending}
        isRemovingVariant={removing}
        displayQuantity={displayQty}
        disableMinus={pending || displayQty < 1}
        onSelectAll={() => mutateVariant(line.quantity)}
        onDecrement={() =>
          mutateVariant(displayQty <= 1 ? 0 : displayQty - 1)
        }
        onIncrement={() => mutateVariant(displayQty + 1)}
        onQuantityChange={(v) => handleUnselectedQuantityChange(variantId, v)}
        onQuantityBlur={() => handleUnselectedQuantityBlur(variantId, line.quantity)}
        onRemove={() => mutateVariant(0)}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="border-[#1e1b84] border-b-2 pb-3 shadow-[0_4px_0_0_#0f172a]">
        <h3 className="font-bold text-gray-800 text-xl">
          Cart items ({visibleCount})
        </h3>
      </div>
      {hasVisibleItems ? (
        <div className="space-y-4">
          {useDisplayLines && displayLines
            ? displayLines.map((line) => {
                if (line.kind === "line_item") {
                  return renderSelectedRow(line.item);
                }
                const { variant_id, ...snap } = line.item;
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
