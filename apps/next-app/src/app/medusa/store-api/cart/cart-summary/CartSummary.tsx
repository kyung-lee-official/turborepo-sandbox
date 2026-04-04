import type { StoreCart } from "@medusajs/types";
import { Button } from "@/app/medusa/components/Button";
import { Card } from "@/app/medusa/components/Card";
import { formatCurrency } from "@/utils/currency";

export const CartSummary = ({
  cart,
  onCheckout,
  checkoutBusy = false,
}: {
  cart: StoreCart;
  onCheckout: () => void;
  checkoutBusy?: boolean;
}) => {
  const canCheckout =
    Boolean(cart.shipping_address) &&
    Boolean(cart.shipping_methods?.length) &&
    Boolean(cart.items?.length);

  return (
    <Card variant="pixel" className="max-w-none bg-stone-50">
      <h3 className="font-bold text-gray-900 text-xl">Cart summary</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-gray-700">Subtotal</span>
          <span className="font-semibold text-gray-900">
            {formatCurrency(cart.subtotal, cart.currency_code)}
          </span>
        </div>
        {cart.tax_total > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-700">Tax</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(cart.tax_total, cart.currency_code)}
            </span>
          </div>
        )}
        {cart.shipping_total > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-700">Shipping</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(cart.shipping_total, cart.currency_code)}
            </span>
          </div>
        )}
        {cart.discount_total > 0 && (
          <div className="flex justify-between gap-4 text-green-700">
            <span>Discount</span>
            <span className="font-semibold">
              -{formatCurrency(cart.discount_total, cart.currency_code)}
            </span>
          </div>
        )}
        <div className="flex justify-between gap-4 border-t-2 border-[#1e1b84] pt-3 font-bold text-base text-gray-900">
          <span>Total</span>
          <span>{formatCurrency(cart.total, cart.currency_code)}</span>
        </div>
      </div>
      <Button
        type="button"
        variant="primary"
        disabled={!canCheckout || checkoutBusy}
        onClick={onCheckout}
      >
        {checkoutBusy ? "Starting checkout…" : "Proceed to checkout"}
      </Button>
      {!canCheckout && (
        <p className="text-center text-gray-600 text-sm">
          {!cart.items?.length
            ? "Select items to checkout"
            : "Add shipping address and a shipping method"}
        </p>
      )}
    </Card>
  );
};
