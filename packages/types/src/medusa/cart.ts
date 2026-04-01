export interface CartMetadata {
  unselected: {
    [key: string]: {
      quantity: number;
    };
  };
  /** Set on the checkout cart once unselected lines are copied to a rescue cart (idempotent retries). */
  rescue_cart_id?: string;
  /** Optional: on the rescue cart, links back to the checkout cart that owned the unselected payload. */
  source_checkout_cart_id?: string;
}
