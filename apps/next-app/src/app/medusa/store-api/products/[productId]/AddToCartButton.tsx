"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/app/medusa/components/Button";
import { useMIdStore } from "@/stores/medusa/medusa-entity-id";
import { addLineItem } from "../../cart/api";

interface AddToCartButtonProps {
  variantId: string;
  variantTitle: string;
}

export const AddToCartButton = ({
  variantId,
  variantTitle,
}: AddToCartButtonProps) => {
  const cartId = useMIdStore((state) => state.cartId);
  const hasHydrated = useMIdStore((state) => state.hasHydrated);
  const queryClient = useQueryClient();

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (!cartId) {
        throw new Error("No cart ID available. Please create a cart first.");
      }
      return addLineItem(cartId, variantId, 1);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["get_cart"] });
    },
  });

  const handleAddToCart = () => {
    addToCartMutation.mutate();
  };

  if (!hasHydrated) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-24 animate-pulse bg-stone-200 shadow-[4px_4px_0_0_#0f172a]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Button
        type="button"
        variant="primary"
        size="compact"
        fullWidth={false}
        onClick={handleAddToCart}
        disabled={!cartId || addToCartMutation.isPending}
      >
        {addToCartMutation.isPending ? "Adding…" : "Add to cart"}
      </Button>
      <span className="sr-only">Variant: {variantTitle}</span>
      {addToCartMutation.isError && (
        <span className="text-red-700 text-xs">
          {addToCartMutation.error instanceof Error
            ? addToCartMutation.error.message
            : "Failed to add to cart"}
        </span>
      )}
      {addToCartMutation.isSuccess && (
        <span className="text-green-800 text-xs">Added to cart.</span>
      )}
    </div>
  );
};
