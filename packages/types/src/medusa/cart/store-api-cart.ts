import type { CartMetadata, CartUnselectedEntry } from "./cart";

/**
 * JSON returned by every handler under `apps/medusa-app/src/api/store-api/carts`:
 * `POST/GET /store-api/carts`, `GET/POST /store-api/carts/:id`,
 * `POST .../line-items`, `.../line-items/:line_id`, `.../line-items/select`,
 * `POST .../delete-line-item`, `DELETE .../line-items/:line_id/unselect`.
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
