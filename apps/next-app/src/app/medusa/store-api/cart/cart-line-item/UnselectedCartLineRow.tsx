"use client";

import type { CartUnselectedEntry } from "@repo/types";
import Image from "next/image";
import { Button } from "@/app/medusa/components/Button";
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
  isRemovingVariant: boolean;
  displayQuantity: number;
  onSelectAll: () => void;
  onDecrement: () => void;
  onIncrement: () => void;
  onQuantityChange: (value: string) => void;
  onQuantityBlur: () => void;
  onRemove: () => void;
  disableMinus: boolean;
};

export const UnselectedCartLineRow = ({
  currencyCode,
  variantId,
  line,
  isQuantityPending,
  isRemovingVariant,
  displayQuantity,
  onSelectAll,
  onDecrement,
  onIncrement,
  onQuantityChange,
  onQuantityBlur,
  onRemove,
  disableMinus,
}: UnselectedCartLineRowProps) => {
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
              aria-label="Not in checkout — check to add all units"
            />
            <label
              htmlFor={`cart-unsel-cb-${variantId}`}
              className="cursor-pointer font-medium text-gray-700 text-sm"
            >
              Not in checkout
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
          <CartQuantityControl
            lineItemId={`unsel-${variantId}`}
            displayQuantity={displayQuantity}
            minQuantity={0}
            onDecrement={onDecrement}
            onIncrement={onIncrement}
            onChange={onQuantityChange}
            onBlur={onQuantityBlur}
            disableMinus={disableMinus}
            disablePlus={isQuantityPending}
            disableInput={isQuantityPending}
          />
          <Button
            type="button"
            variant="danger"
            size="compact"
            fullWidth={false}
            disabled={isRemovingVariant}
            onClick={onRemove}
          >
            {isRemovingVariant ? "Removing..." : "Delete"}
          </Button>
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
