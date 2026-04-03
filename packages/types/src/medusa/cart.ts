export interface CartMetadata {
  unselected: {
    [key: string]: {
      quantity: number;
      created_at: string;
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
