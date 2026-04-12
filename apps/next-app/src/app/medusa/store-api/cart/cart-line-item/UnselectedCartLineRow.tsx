"use client";

import type { CartUnselectedEntry } from "@repo/types";
import Image from "next/image";
import { Card } from "@/app/medusa/components/Card";
import { Checkbox } from "@/app/medusa/components/Checkbox";
import { formatCurrency } from "@/utils/currency";
import { CartQuantityControl } from "./CartQuantityControl";

export type UnselectedLineSnapshot = CartUnselectedEntry;

export type UnselectedCartLineRowProps = {
  currencyCode: string;
  variantId: string;
  line: UnselectedLineSnapshot;
  isQuantityPending: boolean;
  displayQuantity: number;
  onSelectAll: () => void;
  onDecrement: () => void;
  onIncrement: () => void;
  onQuantityChange: (value: string) => void;
  onQuantityBlur: () => void;
};

export const UnselectedCartLineRow = ({
  currencyCode,
  variantId,
  line,
  isQuantityPending,
  displayQuantity,
  onSelectAll,
  onDecrement,
  onIncrement,
  onQuantityChange,
  onQuantityBlur,
}: UnselectedCartLineRowProps) => {
  const disableQty = isQuantityPending;

  return (
    <Card variant="pixel" className="max-w-none space-y-0 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center space-x-2">
            <Checkbox
              id={`cart-unsel-cb-${variantId}`}
              checked={false}
              onChange={onSelectAll}
              disabled={isQuantityPending}
              aria-label="Move all held-aside units to checkout"
            />
            <label
              htmlFor={`cart-unsel-cb-${variantId}`}
              className="cursor-pointer font-medium text-gray-700 text-sm"
            >
              Not selected — check to move all to checkout
            </label>
          </div>
          <h4 className="font-medium">{line.title}</h4>
          {line.subtitle && (
            <p className="text-gray-600 text-sm">{line.subtitle}</p>
          )}
          {line.variant_title && (
            <p className="text-gray-500 text-sm">
              Variant: {line.variant_title}
            </p>
          )}
          <p className="mt-1 font-medium text-gray-700 text-sm">
            {formatCurrency(line.unit_price, currencyCode)}
          </p>
          {line.variant_sku && (
            <p className="text-gray-400 text-xs">SKU: {line.variant_sku}</p>
          )}
        </div>
        <div className="space-y-2 text-right">
          <p className="text-left text-gray-500 text-xs">
            Held aside: + adds one to cart total and moves all units to
            checkout; − at quantity 1 removes the variant; manual entry sets
            absolute quantity (0 removes).
          </p>
          <CartQuantityControl
            lineItemId={`unsel-${variantId}`}
            displayQuantity={displayQuantity}
            minQuantity={0}
            onDecrement={onDecrement}
            onIncrement={onIncrement}
            onChange={onQuantityChange}
            onBlur={onQuantityBlur}
            disableMinus={disableQty || displayQuantity < 1}
            disablePlus={disableQty || displayQuantity < 1}
            disableInput={disableQty}
            incrementAriaLabel="Add one to cart and move to checkout"
            decrementAriaLabel={
              displayQuantity <= 1
                ? "Remove variant from cart"
                : "Remove one from cart total and move to checkout"
            }
          />
        </div>
      </div>
      {line.thumbnail && (
        <Image
          width={300}
          height={300}
          src={line.thumbnail}
          alt={line.title}
          className="mt-2 h-16 w-16 rounded object-cover"
        />
      )}
    </Card>
  );
};
