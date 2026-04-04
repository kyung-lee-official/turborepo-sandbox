"use client";

import type { StoreCart } from "@medusajs/types";
import Image from "next/image";
import { Button } from "@/app/medusa/components/Button";
import { Card } from "@/app/medusa/components/Card";
import { Checkbox } from "@/app/medusa/components/Checkbox";
import { formatCurrency } from "@/utils/currency";
import { CartQuantityControl } from "./CartQuantityControl";

type StoreCartLine = NonNullable<StoreCart["items"]>[number];

export type SelectedCartLineRowProps = {
  cart: StoreCart;
  item: StoreCartLine;
  isSelectionPending: boolean;
  isUpdatingLine: boolean;
  isRemovingLine: boolean;
  displayQuantity: number;
  onToggleUnselect: () => void;
  onDecrement: () => void;
  onIncrement: () => void;
  onQuantityChange: (value: string) => void;
  onQuantityBlur: () => void;
  onRemove: () => void;
  disableMinus: boolean;
};

export const SelectedCartLineRow = ({
  cart,
  item,
  isSelectionPending,
  isUpdatingLine,
  isRemovingLine,
  displayQuantity,
  onToggleUnselect,
  onDecrement,
  onIncrement,
  onQuantityChange,
  onQuantityBlur,
  onRemove,
  disableMinus,
}: SelectedCartLineRowProps) => {
  return (
    <Card className="max-w-none space-y-0 border p-4 shadow-none">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center space-x-2">
            <Checkbox
              id={`cart-line-cb-${item.id}`}
              checked
              onChange={onToggleUnselect}
              disabled={isSelectionPending}
              aria-label="Included in checkout - uncheck to set aside"
            />
            <label
              htmlFor={`cart-line-cb-${item.id}`}
              className="cursor-pointer font-medium text-gray-700 text-sm"
            >
              Selected for checkout
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
            {formatCurrency(Number(item.unit_price), cart.currency_code)}
          </p>
          {item.variant_sku && (
            <p className="text-gray-400 text-xs">SKU: {item.variant_sku}</p>
          )}
        </div>
        <div className="space-y-2 text-right">
          <CartQuantityControl
            lineItemId={item.id}
            displayQuantity={displayQuantity}
            onDecrement={onDecrement}
            onIncrement={onIncrement}
            onChange={onQuantityChange}
            onBlur={onQuantityBlur}
            disableMinus={disableMinus}
            disablePlus={isUpdatingLine}
            disableInput={isUpdatingLine}
          />
          <Button
            type="button"
            variant="danger"
            size="compact"
            fullWidth={false}
            disabled={isRemovingLine}
            onClick={onRemove}
          >
            {isRemovingLine ? "Removing..." : "Delete"}
          </Button>
        </div>
      </div>
      {item.thumbnail && (
        <Image
          width={300}
          height={300}
          src={item.thumbnail}
          alt={item.title ?? ""}
          className="mt-2 h-16 w-16 rounded object-cover"
        />
      )}
    </Card>
  );
};
