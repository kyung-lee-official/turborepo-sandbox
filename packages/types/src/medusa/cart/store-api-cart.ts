import type { CartMetadata, CartUnselectedEntry } from "./cart";

/**
 * JSON returned by every handler under `apps/medusa-app/src/api/store-api/carts`:
 * `POST/GET /store-api/carts`, `GET/POST /store-api/carts/:id`,
 * `POST .../line-items`, `.../line-items/:line_id`, `POST .../variants/:variant_id/quantity` (absolute quantity, clears unselected for that variant),
 * `POST .../delete-line-item` (body: `{ item_id }` — line items only), `DELETE .../line-items/:line_id/unselect`.
 *
 * Shaped like Medusa’s store cart payload but defined here so consumers do not
 * need `@medusajs/types` or wide unions from upstream.
 */
export interface StoreApiCartResponse {
  cart: StoreApiCart;
}

/** Cart resource after `applyStoreCartDisplayOrder` (sorted items + `display_lines`). */
export interface StoreApiCart {
  id: string;
  currency_code: string;
  email: string | null;
  locale: string | null;
  region_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  total: number;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  discount_subtotal: number;
  discount_tax_total: number;
  original_total: number;
  /** Subtotal before discounts, excluding taxes (Medusa `BaseCart.original_subtotal`). */
  original_subtotal: number;
  original_tax_total: number;
  gift_card_total: number;
  gift_card_tax_total: number;
  item_total: number;
  item_subtotal: number;
  item_tax_total: number;
  item_discount_total: number;
  original_item_total: number;
  original_item_subtotal: number;
  original_item_tax_total: number;
  shipping_total: number;
  shipping_subtotal: number;
  shipping_tax_total: number;
  shipping_discount_total: number;
  original_shipping_tax_total: number;
  original_shipping_subtotal: number;
  original_shipping_total: number;
  credit_line_subtotal: number;
  credit_line_tax_total: number;
  credit_line_total: number;
  metadata: CartMetadata | null;
  sales_channel_id: string | null;
  /** Present on full `refetchCart` responses; some workflows omit expanded relations. */
  promotions?: StoreApiCartPromotion[];
  items: StoreApiCartLineItem[];
  /**
   * Interleaved line items and unselected snapshots for storefront UI
   * (same ordering as sorted `items` + `metadata.unselected`).
   */
  display_lines: StoreApiCartDisplayLine[];
  /** Present on full `refetchCart` responses; some workflows omit expanded relations. */
  customer?: StoreApiCartCustomer | null;
  /** Present on full `refetchCart` responses; some workflows omit expanded relations. */
  shipping_methods?: StoreApiCartShippingMethod[];
  shipping_address_id: string | null;
  shipping_address: StoreApiCartAddress | null;
  billing_address_id: string | null;
  billing_address: StoreApiCartAddress | null;
  region: StoreApiCartRegion | null;
  /** Present on full `refetchCart` (`*payment_collection`); workflows may omit. */
  payment_collection?: StoreApiPaymentCollection | null;
  /** Present on full `refetchCart` (`*credit_lines`); workflows may omit. */
  credit_lines?: StoreApiCreditLine[];
}

export interface StoreApiCartPromotion {
  id: string;
  /** May be null for some automatic promotions or stale cart relations. */
  code: string | null;
  is_automatic: boolean;
  is_tax_inclusive: boolean;
  application_method: StoreApiPromotionApplicationMethod | null;
}

export interface StoreApiPromotionApplicationMethod {
  value: number;
  type: string;
  currency_code: string;
}

export interface StoreApiCartTaxLine {
  id: string;
  description: string | null;
  code: string;
  rate: number;
  provider_id: string | null;
}

export interface StoreApiCartLineAdjustment {
  id: string;
  code: string | null;
  promotion_id: string | null;
  amount: number;
  is_tax_inclusive: boolean;
}

/** Nested product payload on a line item (fields from default store cart query). */
export interface StoreApiCartLineItemProduct {
  id: string;
  categories?: { id: string }[];
  tags?: { id: string }[];
  collection_id: string | null;
  type_id: string | null;
}

export interface StoreApiCartLineItemVariant {
  id: string;
  title?: string | null;
  sku?: string | null;
  barcode?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface StoreApiCartLineItem {
  id: string;
  subtitle?: string | null;
  thumbnail: string | null;
  product: StoreApiCartLineItemProduct | null;
  variant: StoreApiCartLineItemVariant | null;
  variant_id: string | null;
  product_id: string | null;
  product_title: string | null;
  product_description: string | null;
  product_subtitle: string | null;
  product_type: unknown;
  product_collection: unknown;
  product_handle: string | null;
  product_type_id: string | null;
  variant_sku: string | null;
  variant_barcode: string | null;
  variant_title: string | null;
  requires_shipping: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  title: string;
  quantity: number;
  unit_price: number;
  compare_at_unit_price: number | null;
  is_tax_inclusive: boolean;
  /** Present when cart query expands line totals (`items.*` / default store-api fields). Minor currency units. */
  original_subtotal?: number;
  original_tax_total?: number;
  original_total?: number;
  /** Pre-adjustment line amounts (Medusa often exposes these on line items instead of `original_subtotal`). */
  original_item_subtotal?: number;
  original_item_total?: number;
  item_subtotal?: number;
  item_tax_total?: number;
  item_total?: number;
  subtotal?: number;
  tax_total?: number;
  total?: number;
  discount_total?: number;
  discount_tax_total?: number;
  tax_lines: StoreApiCartTaxLine[];
  adjustments: StoreApiCartLineAdjustment[];
}

/** Payload for a `display_lines` row when `kind` is `"unselected"` (variant id + snapshot fields). */
export type StoreApiCartUnselectedSnapshot = {
  variant_id: string;
} & CartUnselectedEntry;

/**
 * Interleaved cart UI rows: same top-level shape for both kinds — always `kind` + `item`.
 */
export type StoreApiCartDisplayLine =
  | { kind: "line_item"; item: StoreApiCartLineItem }
  | { kind: "unselected"; item: StoreApiCartUnselectedSnapshot };

export interface StoreApiCartCustomer {
  id: string;
  email: string | null;
  groups: { id: string }[];
}

export interface StoreApiCartShippingMethod {
  id: string;
  name: string;
  description?: string | null;
  amount: number;
  is_tax_inclusive: boolean;
  shipping_option_id: string | null;
  tax_lines: StoreApiCartTaxLine[];
  adjustments: StoreApiCartShippingMethodAdjustment[];
}

export interface StoreApiCartShippingMethodAdjustment {
  id: string;
  code: string | null;
  amount: number;
}

export interface StoreApiCartAddress {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  address_1: string | null;
  address_2: string | null;
  city: string | null;
  postal_code: string | null;
  country_code: string | null;
  region_code: string | null;
  province: string | null;
  phone: string | null;
}

export interface StoreApiCartRegion {
  id: string;
  name: string;
  currency_code: string;
  automatic_taxes: boolean;
  countries: StoreApiRegionCountry[];
}

export interface StoreApiRegionCountry {
  iso_2?: string;
  display_name?: string;
}

export interface StoreApiPaymentSession {
  id: string;
  provider_id: string;
  status: string;
  data: Record<string, unknown> | null;
  amount: number;
  currency_code: string;
}

export interface StoreApiPaymentCollection {
  id: string;
  status: string;
  amount: number;
  currency_code: string;
  authorized_amount?: number;
  captured_amount?: number;
  refunded_amount?: number;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
  payment_sessions: StoreApiPaymentSession[];
}

export interface StoreApiCreditLine {
  id: string;
  amount: number;
  raw_amount: number;
  subtotal: number;
  tax_total: number;
  total: number;
  reference: string | null;
  reference_id: string | null;
}

/**
 * @deprecated Prefer {@link storeApiLineAmountPairMeaningfulDiscount}; kept for callers that
 * inlined the old constant.
 */
export const STORE_API_CART_LINE_PRICE_EPS = 0.01;

export type StoreApiCartLinePriceDisplay = {
  /** Amount to show with strikethrough when `showStrike` is true (line or unit-derived). */
  original: number;
  /** Current / discounted amount to emphasize. */
  discounted: number;
  showStrike: boolean;
};

/** True when `original` is meaningfully above `discounted` (handles float noise and small promos). */
export function storeApiLineAmountPairMeaningfulDiscount(
  original: number,
  discounted: number,
): boolean {
  if (!(original > discounted)) {
    return false;
  }
  const delta = original - discounted;
  const tol = Math.max(0.005, Math.abs(original) * 1e-9);
  return delta > tol;
}

type LineTotalPick = {
  is_tax_inclusive: boolean;
  original_subtotal?: number;
  original_total?: number;
  subtotal?: number;
  total?: number;
  original_item_subtotal?: number;
  original_item_total?: number;
  item_subtotal?: number;
  item_total?: number;
};

/**
 * Picks original vs payable line amounts for cart rows.
 *
 * **Tax-exclusive (`is_tax_inclusive: false`):** Medusa often keeps `subtotal` equal to
 * `original_subtotal` and applies promotions on **`total`** (see store cart line items).
 * Pair list/original with **`total`** (then `item_total`, then `subtotal` / `item_subtotal`).
 *
 * **Tax-inclusive:** use `original_total` / `total` (and `original_item_total` / `item_total`).
 *
 * `showStrike` in the UI is derived from these numbers (via
 * {@link storeApiLineAmountPairMeaningfulDiscount}); it is not a Medusa field.
 */
export function storeApiLineAmountPairFromTotals(
  fields: LineTotalPick,
): { original: number; discounted: number } | null {
  const tryInclusive = (): { original: number; discounted: number } | null => {
    const o = toFiniteNumber(fields.original_total);
    const d = toFiniteNumber(fields.total);
    if (o != null && d != null) {
      return { original: o, discounted: d };
    }
    const o2 = toFiniteNumber(fields.original_item_total);
    const d2 = toFiniteNumber(fields.item_total);
    if (o2 != null && d2 != null) {
      return { original: o2, discounted: d2 };
    }
    return null;
  };
  const tryExclusive = (): { original: number; discounted: number } | null => {
    const original =
      toFiniteNumber(fields.original_subtotal) ??
      toFiniteNumber(fields.original_total);
    const discounted =
      toFiniteNumber(fields.total) ??
      toFiniteNumber(fields.item_total) ??
      toFiniteNumber(fields.subtotal) ??
      toFiniteNumber(fields.item_subtotal);
    if (original != null && discounted != null) {
      return { original, discounted };
    }
    const o2 =
      toFiniteNumber(fields.original_item_subtotal) ??
      toFiniteNumber(fields.original_item_total);
    const d2 =
      toFiniteNumber(fields.item_total) ??
      toFiniteNumber(fields.item_subtotal);
    if (o2 != null && d2 != null) {
      return { original: o2, discounted: d2 };
    }
    return null;
  };

  const primary = fields.is_tax_inclusive ? tryInclusive() : tryExclusive();
  if (primary) {
    return primary;
  }
  return fields.is_tax_inclusive ? tryExclusive() : tryInclusive();
}

function toFiniteNumber(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === "object") {
    const o = value as { numeric?: unknown; value?: unknown };
    if (o.numeric != null) {
      const n = Number(o.numeric);
      return Number.isFinite(n) ? n : null;
    }
    if (o.value != null) {
      const n = Number(o.value);
      return Number.isFinite(n) ? n : null;
    }
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Pick original vs discounted **line** amounts for UI.
 * Uses {@link storeApiLineAmountPairFromTotals} (Medusa often exposes `original_item_*` /
 * `item_*` on lines). Fallback: `compare_at_unit_price` vs `unit_price` × quantity.
 */
export function storeApiCartLinePriceDisplay(
  item: Pick<
    StoreApiCartLineItem,
    "is_tax_inclusive" | "quantity" | "unit_price" | "compare_at_unit_price"
  > &
    Partial<
      Pick<
        StoreApiCartLineItem,
        | "original_subtotal"
        | "original_total"
        | "subtotal"
        | "total"
        | "original_item_subtotal"
        | "original_item_total"
        | "item_subtotal"
        | "item_total"
      >
    >,
): StoreApiCartLinePriceDisplay {
  const pair = storeApiLineAmountPairFromTotals(item);
  if (pair) {
    const showStrike = storeApiLineAmountPairMeaningfulDiscount(
      pair.original,
      pair.discounted,
    );
    return {
      original: pair.original,
      discounted: pair.discounted,
      showStrike,
    };
  }

  const qty = Math.max(0, Number(item.quantity) || 0);
  const q = qty > 0 ? qty : 1;
  const compareAt = toFiniteNumber(item.compare_at_unit_price);
  const unit = toFiniteNumber(item.unit_price) ?? 0;
  const origLine = compareAt != null ? compareAt * q : null;
  const discLine = unit * q;
  if (
    origLine != null &&
    storeApiLineAmountPairMeaningfulDiscount(origLine, discLine)
  ) {
    return {
      original: origLine,
      discounted: discLine,
      showStrike: true,
    };
  }

  return { original: discLine, discounted: discLine, showStrike: false };
}

/**
 * Like {@link storeApiCartLinePriceDisplay} but scales persisted line totals when the UI
 * quantity differs from the server line (optimistic quantity).
 */
export function storeApiCartLinePriceDisplayForQuantity(
  item: Pick<
    StoreApiCartLineItem,
    | "is_tax_inclusive"
    | "quantity"
    | "unit_price"
    | "compare_at_unit_price"
  > &
    Partial<
      Pick<
        StoreApiCartLineItem,
        | "original_subtotal"
        | "original_total"
        | "subtotal"
        | "total"
        | "original_item_subtotal"
        | "original_item_total"
        | "item_subtotal"
        | "item_total"
      >
    >,
  displayQuantity: number,
): StoreApiCartLinePriceDisplay {
  const serverQty = Math.max(0, Number(item.quantity) || 0);
  const displayQty = Math.max(0, Number(displayQuantity) || 0);
  if (serverQty <= 0) {
    return storeApiCartLinePriceDisplay({
      ...item,
      quantity: displayQty > 0 ? displayQty : 1,
    });
  }
  const ratio = displayQty / serverQty;
  const scale = (n: number | undefined | null) => {
    if (n == null || !Number.isFinite(Number(n))) {
      return undefined;
    }
    return Number(n) * ratio;
  };
  return storeApiCartLinePriceDisplay({
    ...item,
    quantity: displayQty > 0 ? displayQty : serverQty,
    original_subtotal: scale(item.original_subtotal),
    original_total: scale(item.original_total),
    subtotal: scale(item.subtotal),
    total: scale(item.total),
    original_item_subtotal: scale(item.original_item_subtotal),
    original_item_total: scale(item.original_item_total),
    item_subtotal: scale(item.item_subtotal),
    item_total: scale(item.item_total),
  });
}

/**
 * Set-aside row: same line-total logic as selected lines when snapshot includes totals;
 * otherwise `compare_at_unit_price` vs `unit_price` for the **display** quantity.
 */
export function storeApiUnselectedPriceDisplay(
  entry: CartUnselectedEntry,
  displayQuantity: number,
): StoreApiCartLinePriceDisplay {
  const snapshotQty = Math.max(0, Number(entry.quantity) || 0);
  const displayQty = Math.max(0, Number(displayQuantity) || 0);
  const ratio =
    snapshotQty > 0 && displayQty >= 0 ? displayQty / snapshotQty : 1;

  const scaled = (v: number | null | undefined) => {
    const n = toFiniteNumber(v);
    if (n == null) {
      return undefined;
    }
    return n * ratio;
  };

  const hasLineTotals =
    toFiniteNumber(entry.original_subtotal) != null ||
    toFiniteNumber(entry.subtotal) != null ||
    toFiniteNumber(entry.original_total) != null ||
    toFiniteNumber(entry.total) != null ||
    toFiniteNumber(entry.original_item_subtotal) != null ||
    toFiniteNumber(entry.item_subtotal) != null ||
    toFiniteNumber(entry.original_item_total) != null ||
    toFiniteNumber(entry.item_total) != null;

  if (hasLineTotals) {
    const pair = storeApiLineAmountPairFromTotals({
      is_tax_inclusive: Boolean(entry.is_tax_inclusive),
      original_subtotal: scaled(entry.original_subtotal ?? undefined),
      subtotal: scaled(entry.subtotal ?? undefined),
      original_total: scaled(entry.original_total ?? undefined),
      total: scaled(entry.total ?? undefined),
      original_item_subtotal: scaled(entry.original_item_subtotal ?? undefined),
      item_subtotal: scaled(entry.item_subtotal ?? undefined),
      original_item_total: scaled(entry.original_item_total ?? undefined),
      item_total: scaled(entry.item_total ?? undefined),
    });
    if (pair) {
      const showStrike = storeApiLineAmountPairMeaningfulDiscount(
        pair.original,
        pair.discounted,
      );
      return {
        original: pair.original,
        discounted: pair.discounted,
        showStrike,
      };
    }
  }

  const q = displayQty > 0 ? displayQty : 1;
  const unit = toFiniteNumber(entry.unit_price) ?? 0;
  const compareAt = toFiniteNumber(entry.compare_at_unit_price);
  const origLine = compareAt != null ? compareAt * q : null;
  const discLine = unit * q;
  if (
    origLine != null &&
    storeApiLineAmountPairMeaningfulDiscount(origLine, discLine)
  ) {
    return {
      original: origLine,
      discounted: discLine,
      showStrike: true,
    };
  }
  return { original: discLine, discounted: discLine, showStrike: false };
}
