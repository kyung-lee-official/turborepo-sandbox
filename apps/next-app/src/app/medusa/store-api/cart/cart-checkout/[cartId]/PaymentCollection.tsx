"use client";

import type { StoreApiCart } from "@repo/types";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Alert } from "@/app/medusa/components/Alert";
import { Card } from "@/app/medusa/components/Card";
import { PageHeading } from "@/app/medusa/components/PageHeading";
import { PixelSurface } from "@/app/medusa/components/PixelSurface";
import { StoreApiScaffold } from "@/app/medusa/components/StoreApiScaffold";
import { cn } from "@/lib/utils";
import { useMIdStore } from "@/stores/medusa/medusa-entity-id";
import { formatCurrency } from "@/utils/currency";
import { createCart, getCart, QK_CART } from "../../api";
import { PaymentSession } from "./PaymentSession";

const PaymentCollection = ({ cartId }: { cartId: string }) => {
  const hasHydrated = useMIdStore((state) => state.hasHydrated);
  const regionId = useMIdStore((state) => state.regionId);
  const setCartId = useMIdStore((state) => state.setCartId);

  const cartQuery = useQuery({
    queryKey: [QK_CART.GET_CART, cartId, regionId],
    queryFn: async () => {
      let cart: StoreApiCart;
      if (!cartId) {
        if (!regionId) {
          throw new Error("Region ID is required to create a cart");
        }
        const cartRes = await createCart(regionId);
        cart = cartRes.cart;
      } else {
        const cartRes = await getCart(cartId);
        cart = cartRes.cart;
      }
      setCartId(cart.id);
      return cart;
    },
    enabled: hasHydrated && !!regionId,
  });

  if (!regionId) {
    return (
      <StoreApiScaffold maxWidth="narrow">
        <Alert title="Region required" variant="warning" appearance="pixel">
          Select a region on the region page first.
        </Alert>
      </StoreApiScaffold>
    );
  }

  if (cartQuery.isLoading) {
    return (
      <StoreApiScaffold maxWidth="narrow">
        <PixelSurface className="p-6" shadow="md">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/4 bg-stone-200" />
            <div className="h-64 bg-stone-200" />
          </div>
        </PixelSurface>
      </StoreApiScaffold>
    );
  }

  if (cartQuery.isError) {
    return (
      <StoreApiScaffold maxWidth="narrow">
        <Alert title="Error loading cart" variant="error" appearance="pixel">
          {cartQuery.error instanceof Error
            ? cartQuery.error.message
            : "Unknown error"}
        </Alert>
      </StoreApiScaffold>
    );
  }

  const cart = cartQuery.data;
  if (!cart) {
    return (
      <StoreApiScaffold maxWidth="narrow">
        <p className="text-gray-600">No cart data available</p>
      </StoreApiScaffold>
    );
  }

  const paymentCollection = cart.payment_collection;

  if (!paymentCollection) {
    return (
      <StoreApiScaffold maxWidth="narrow">
        <Alert
          title="No payment collection"
          variant="warning"
          appearance="pixel"
        >
          No payment collection found for this cart.
        </Alert>
      </StoreApiScaffold>
    );
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "not_paid":
        return "border border-red-800 bg-red-100 text-red-900 shadow-[2px_2px_0_0_#450a0a]";
      case "awaiting":
        return "border border-amber-800 bg-amber-100 text-amber-950 shadow-[2px_2px_0_0_#78350f]";
      case "authorized":
        return "border border-blue-800 bg-blue-100 text-blue-900 shadow-[2px_2px_0_0_#1e3a8a]";
      case "partially_authorized":
        return "border border-orange-800 bg-orange-100 text-orange-950 shadow-[2px_2px_0_0_#7c2d12]";
      case "canceled":
        return "border border-gray-600 bg-gray-100 text-gray-900 shadow-[2px_2px_0_0_#0f172a]";
      default:
        return "border border-gray-600 bg-gray-100 text-gray-900 shadow-[2px_2px_0_0_#0f172a]";
    }
  };

  return (
    <StoreApiScaffold maxWidth="narrow">
      <details className="mb-6">
        <summary className="cursor-pointer font-mono text-gray-600 text-sm underline decoration-2 decoration-[#1e1b84] underline-offset-2">
          Raw cart JSON (debug)
        </summary>
        <PixelSurface className="mt-3 overflow-auto p-4" shadow="sm">
          <pre className="font-mono text-gray-800 text-xs">
            {JSON.stringify(cart, null, 2)}
          </pre>
        </PixelSurface>
      </details>

      <PageHeading title="Payment collection" description={`Cart ${cart.id}`} />

      <div className="mt-8 space-y-8">
        <Card variant="pixel" className="max-w-none space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-bold text-gray-900 text-xl">Payment status</h2>
            <span
              className={cn(
                "rounded-none px-3 py-1 font-semibold text-sm",
                getStatusBadgeColor(paymentCollection.status),
              )}
            >
              {paymentCollection.status.replace("_", " ").toUpperCase()}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-semibold text-gray-700 text-sm">
                Payment collection ID
              </p>
              <p className="mt-1 font-mono text-gray-900 text-sm">
                {paymentCollection.id}
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-700 text-sm">Currency</p>
              <p className="mt-1 text-gray-900">
                {paymentCollection.currency_code.toUpperCase()}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="pixel" className="max-w-none space-y-4 p-6">
          <h2 className="font-bold text-gray-900 text-xl">Amounts</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="border-blue-600 border-l-4 bg-blue-50 p-4 shadow-[4px_4px_0_0_#1e3a8a]">
              <p className="font-semibold text-blue-900 text-sm">Total</p>
              <p className="mt-1 font-bold text-blue-950 text-lg">
                {formatCurrency(
                  paymentCollection.amount ?? 0,
                  paymentCollection.currency_code,
                )}
              </p>
            </div>
            <div className="border-green-600 border-l-4 bg-green-50 p-4 shadow-[4px_4px_0_0_#14532d]">
              <p className="font-semibold text-green-900 text-sm">Authorized</p>
              <p className="mt-1 font-bold text-green-950 text-lg">
                {formatCurrency(
                  paymentCollection.authorized_amount ?? 0,
                  paymentCollection.currency_code,
                )}
              </p>
            </div>
            <div className="border-purple-600 border-l-4 bg-purple-50 p-4 shadow-[4px_4px_0_0_#4c1d95]">
              <p className="font-semibold text-purple-900 text-sm">Captured</p>
              <p className="mt-1 font-bold text-lg text-purple-950">
                {formatCurrency(
                  paymentCollection.captured_amount ?? 0,
                  paymentCollection.currency_code,
                )}
              </p>
            </div>
            <div className="border-orange-600 border-l-4 bg-orange-50 p-4 shadow-[4px_4px_0_0_#7c2d12]">
              <p className="font-semibold text-orange-900 text-sm">Refunded</p>
              <p className="mt-1 font-bold text-lg text-orange-950">
                {formatCurrency(
                  paymentCollection.refunded_amount ?? 0,
                  paymentCollection.currency_code,
                )}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="pixel" className="max-w-none space-y-4 p-6">
          <h2 className="font-bold text-gray-900 text-xl">Timeline</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="font-semibold text-gray-700 text-sm">Created</p>
              <p className="mt-1 text-gray-900 text-sm">
                {dayjs(paymentCollection.created_at).format(
                  "YYYY-MM-DD HH:mm:ss",
                )}
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-700 text-sm">Updated</p>
              <p className="mt-1 text-gray-900 text-sm">
                {dayjs(paymentCollection.updated_at).format(
                  "YYYY-MM-DD HH:mm:ss",
                )}
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-700 text-sm">Completed</p>
              <p className="mt-1 text-gray-900 text-sm">
                {dayjs(paymentCollection.completed_at).format(
                  "YYYY-MM-DD HH:mm:ss",
                )}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="pixel" className="max-w-none space-y-4 p-6">
          <h2 className="font-bold text-gray-900 text-xl">Payment sessions</h2>
          {paymentCollection.payment_sessions &&
          paymentCollection.payment_sessions.length > 0 ? (
            <div className="space-y-3">
              {paymentCollection.payment_sessions.map(
                (
                  session: {
                    id?: string;
                    provider_id?: string;
                    status?: string;
                    amount?: number;
                  },
                  index: number,
                ) => (
                  <PixelSurface
                    key={session.id || String(index)}
                    shadow="sm"
                    className="p-4"
                  >
                    <div className="grid gap-2 md:grid-cols-3">
                      <div>
                        <span className="font-semibold text-gray-700 text-sm">
                          Provider:
                        </span>
                        <span className="ml-2 text-gray-900">
                          {session.provider_id || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700 text-sm">
                          Status:
                        </span>
                        <span className="ml-2 text-gray-900">
                          {session.status || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700 text-sm">
                          Amount:
                        </span>
                        <span className="ml-2 text-gray-900">
                          {formatCurrency(
                            session.amount ?? 0,
                            paymentCollection.currency_code,
                          )}
                        </span>
                      </div>
                    </div>
                    {session.id && (
                      <div className="mt-2 text-gray-600 text-sm">
                        Session ID:{" "}
                        <span className="font-mono text-xs">{session.id}</span>
                      </div>
                    )}
                  </PixelSurface>
                ),
              )}
            </div>
          ) : (
            <p className="text-gray-600">No payment sessions found</p>
          )}
        </Card>

        <PaymentSession
          paymentCollectionId={paymentCollection.id}
          regionId={regionId}
          cartId={cartId}
          hasHydrated={hasHydrated}
        />
      </div>
    </StoreApiScaffold>
  );
};

export default PaymentCollection;
