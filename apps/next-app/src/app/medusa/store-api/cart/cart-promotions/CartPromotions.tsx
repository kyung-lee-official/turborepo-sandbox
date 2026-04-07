"use client";

import type { StoreCartResponse } from "@medusajs/types";
import type { StoreApiCartPromotion, StoreApiCartResponse } from "@repo/types";
import { useState } from "react";
import { Alert } from "@/app/medusa/components/Alert";
import { Button } from "@/app/medusa/components/Button";
import { Card } from "@/app/medusa/components/Card";
import { TextInput } from "@/app/medusa/components/TextInput";
import { addPromotions, removePromotions } from "../api";

interface CartPromotionsProps {
  cart: StoreApiCartResponse;
  /** Standard Medusa `POST/DELETE /store/carts/:id/promotions` payload (no `display_lines`). */
  onCartUpdate?: (updatedCart: StoreCartResponse) => void;
}

export default function CartPromotions({
  cart,
  onCartUpdate,
}: CartPromotionsProps) {
  const [promoCode, setPromoCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddPromotion = async () => {
    if (!promoCode.trim()) {
      setError("Please enter a promo code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updatedCart = await addPromotions(cart.cart.id, promoCode.trim());
      setPromoCode("");
      onCartUpdate?.(updatedCart);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add promotion");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePromotion = async (code: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const updatedCart = await removePromotions(cart.cart.id, code);
      onCartUpdate?.(updatedCart);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove promotion",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleAddPromotion();
    }
  };

  const appliedPromotions = (cart.cart.promotions ?? []).filter(
    (p): p is StoreApiCartPromotion =>
      p != null && typeof p === "object" && "id" in p,
  );

  return (
    <Card variant="pixel" className="max-w-none bg-stone-50">
      <h3 className="font-bold text-gray-900 text-lg">Promotional codes</h3>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="promo-code"
          className="font-semibold text-gray-800 text-sm"
        >
          Enter promo code
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <TextInput
            id="promo-code"
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Promo code"
            disabled={isLoading}
            className="min-w-0 flex-1"
          />
          <Button
            type="button"
            variant="primary"
            size="compact"
            fullWidth={false}
            className="sm:self-start"
            onClick={handleAddPromotion}
            disabled={isLoading || !promoCode.trim()}
          >
            {isLoading ? "Adding…" : "Apply"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert title="Promo code" variant="error" appearance="pixel">
          {error}
        </Alert>
      )}

      {appliedPromotions.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-800 text-sm">
            Applied promotions
          </h4>
          <div className="space-y-2">
            {appliedPromotions.map((promotion) => {
              const label =
                (promotion.code ?? "").trim() ||
                (promotion.is_automatic ? "Automatic promotion" : promotion.id);
              const canRemoveByCode = (promotion.code ?? "").trim().length > 0;
              return (
                <div
                  key={promotion.id}
                  className="flex items-center justify-between gap-3 border-2 border-green-800 bg-green-50 p-3 shadow-[4px_4px_0_0_#14532d]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-green-900 text-sm">
                      {label}
                    </p>
                    {promotion.application_method && (
                      <p className="text-green-800 text-xs capitalize">
                        {promotion.application_method.type} discount of{" "}
                        {promotion.application_method.type === "fixed"
                          ? `${promotion.application_method.currency_code.toUpperCase()} ${promotion.application_method.value}`
                          : `${promotion.application_method.value}%`}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="danger"
                    size="compact"
                    fullWidth={false}
                    onClick={() => {
                      const code = (promotion.code ?? "").trim();
                      if (code) handleRemovePromotion(code);
                    }}
                    disabled={isLoading || !canRemoveByCode}
                    title={
                      canRemoveByCode
                        ? undefined
                        : "This promotion has no code; remove it in admin or clear cart line adjustments"
                    }
                  >
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {appliedPromotions.length === 0 && (
        <div className="py-2 text-center">
          <p className="text-gray-600 text-sm">No promotional codes applied</p>
        </div>
      )}
    </Card>
  );
}
