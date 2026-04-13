"use client";

import type { StoreApiCartLinePriceDisplay } from "@repo/types";
import { formatCurrency } from "@/utils/currency";

export type CartLinePriceProps = {
  currencyCode: string;
  /** Built in `@repo/types` from Medusa line totals / compare-at; `showStrike` is never sent by the API. */
  display: StoreApiCartLinePriceDisplay;
  className?: string;
};

/**
 * Line-level original (strikethrough) + discounted amounts.
 * Design: `CartLinePrice.pen` (stub copied from PageHeading — open in Pencil and replace with the price row).
 */
export const CartLinePrice = ({
  currencyCode,
  display,
  className = "",
}: CartLinePriceProps) => {
  const { original, discounted, showStrike } = display;

  return (
    <p
      className={`mt-1 flex flex-wrap items-baseline gap-x-2 text-sm ${className}`.trim()}
    >
      <span
        className={`font-semibold text-gray-900 ${showStrike ? "order-1" : ""}`.trim()}
      >
        <span className="sr-only">Discounted price </span>
        {formatCurrency(discounted, currencyCode)}
      </span>
      {showStrike ? (
        <span className="order-2 font-normal text-gray-500 line-through decoration-gray-400">
          <span className="sr-only">Original price </span>
          {formatCurrency(original, currencyCode)}
        </span>
      ) : null}
    </p>
  );
};
