export interface CartMetadata {
  unselected: {
    [key: string]: {
      quantity: number;
      created_at: string;
      title: string;
      subtitle: string | null;
      variant_title: string | null;
      variant_sku: string | null;
      unit_price: number;
      /** Copied from the line item at unselect time; optional on older carts. */
      compare_at_unit_price?: number | null;
      /**
       * Line totals captured when the row was moved to set-aside (same naming as
       * {@link StoreApiCartLineItem}); optional on older carts. Used for promo strikethrough
       * when `compare_at_unit_price` is unset.
       */
      is_tax_inclusive?: boolean;
      original_subtotal?: number | null;
      subtotal?: number | null;
      original_total?: number | null;
      total?: number | null;
      original_item_subtotal?: number | null;
      item_subtotal?: number | null;
      original_item_total?: number | null;
      item_total?: number | null;
      thumbnail: string | null;
    };
  };
  /**
   * Write-once map: variant_id → ISO timestamp of when the item was *first* added to this cart.
   * Persists through select/unselect cycles so `unselected[].created_at` always reflects
   * the original first-add time rather than the most recent re-add time.
   */
  item_original_created_at?: {
    [variant_id: string]: string;
  };
  /** Set on the checkout cart once unselected lines are copied to a rescue cart (idempotent retries). */
  rescue_cart_id?: string;
  /** Optional: on the rescue cart, links back to the checkout cart that owned the unselected payload. */
  source_checkout_cart_id?: string;
}

/** One row in `metadata.unselected` (keyed by variant_id). */
export type CartUnselectedEntry = CartMetadata["unselected"][string];

/**
 * Alias of {@link StoreApiCartDisplayLine}. Response-only ordering for storefront
 * cart UI (not persisted); built server-side by `applyStoreCartDisplayOrder`.
 */
export type { StoreApiCartDisplayLine as CartDisplayLine } from "./store-api-cart";
