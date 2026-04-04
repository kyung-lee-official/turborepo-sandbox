import type { StoreCart } from "@medusajs/types";
import { Card } from "@/app/medusa/components/Card";

export const CartInfo = ({ cart }: { cart: StoreCart }) => (
  <Card variant="pixel" className="max-w-none bg-indigo-50/80">
    <h3 className="font-bold text-gray-900 text-lg">Cart information</h3>
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <span className="font-semibold text-gray-800">Cart ID</span>
        <p className="break-all font-mono text-xs text-gray-700">{cart.id}</p>
      </div>
      <div>
        <span className="font-semibold text-gray-800">Currency</span>
        <p className="text-gray-800">{cart.currency_code.toUpperCase()}</p>
      </div>
      {cart.email && (
        <div>
          <span className="font-semibold text-gray-800">Email</span>
          <p className="text-gray-800">{cart.email}</p>
        </div>
      )}
      {cart.region && (
        <div>
          <span className="font-semibold text-gray-800">Region</span>
          <p className="text-gray-800">{cart.region.name}</p>
        </div>
      )}
      <div>
        <span className="font-semibold text-gray-800">Created</span>
        <p className="text-gray-800">
          {cart.created_at
            ? new Date(cart.created_at).toLocaleDateString()
            : "N/A"}
        </p>
      </div>
      <div>
        <span className="font-semibold text-gray-800">Updated</span>
        <p className="text-gray-800">
          {cart.updated_at
            ? new Date(cart.updated_at).toLocaleDateString()
            : "N/A"}
        </p>
      </div>
    </div>
  </Card>
);
