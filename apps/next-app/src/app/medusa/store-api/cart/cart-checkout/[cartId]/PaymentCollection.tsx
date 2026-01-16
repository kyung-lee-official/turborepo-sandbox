"use client";

import { StoreCart } from "@medusajs/types/dist/http/cart/store/entities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useMIdStore } from "@/stores/medusa/medusa-entity-id";
import { formatCurrency } from "@/utils/currency";
import { authorizePaymentSession } from "../../../payment/api";
import { createCart, getCart, QK_CART } from "../../api";
import { shouldShowAuthorizeButton } from "./PaymentProviderService";
import { PaymentSession } from "./PaymentSession";

const PaymentCollection = ({ cartId }: { cartId: string }) => {
  const hasHydrated = useMIdStore((state) => state.hasHydrated);
  const regionId = useMIdStore((state) => state.regionId);
  const setCartId = useMIdStore((state) => state.setCartId);
  const queryClient = useQueryClient();
  const router = useRouter();

  const cartQuery = useQuery({
    queryKey: [QK_CART.GET_CART, cartId, regionId],
    queryFn: async () => {
      let cart: StoreCart;
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

  const authorizeSessionMutation = useMutation({
    mutationFn: (paymentSessionId: string) =>
      authorizePaymentSession(paymentSessionId),
    onSuccess: (data) => {
      // Invalidate queries to get the updated cart data
      queryClient.invalidateQueries({
        queryKey: [QK_CART.GET_CART, cartId, regionId],
      });

      // Redirect to the order page using the order ID from the response
      if ((data as any).order?.id) {
        router.push(`/medusa/store-api/order/${(data as any).order.id}`);
      }
    },
  });

  const handleAuthorizeSession = async (paymentSessionId: string) => {
    try {
      await authorizeSessionMutation.mutateAsync(paymentSessionId);
    } catch (error) {
      console.error("Failed to authorize payment session:", error);
    }
  };

  if (!regionId) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <h2 className="mb-2 font-semibold text-lg text-yellow-800">
            Region Required
          </h2>
          <p className="text-yellow-700">
            Please select a region on the region page to view cart information.
          </p>
        </div>
      </div>
    );
  }

  if (cartQuery.isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/4 rounded bg-gray-200"></div>
          <div className="h-64 rounded bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (cartQuery.isError) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h2 className="mb-2 font-semibold text-lg text-red-800">
            Error Loading Cart
          </h2>
          <p className="text-red-700">
            {cartQuery.error instanceof Error
              ? cartQuery.error.message
              : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  const cart = cartQuery.data;
  if (!cart) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-gray-500">No cart data available</p>
      </div>
    );
  }

  const paymentCollection = cart.payment_collection;

  if (!paymentCollection) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <h2 className="mb-2 font-semibold text-lg text-yellow-800">
            No Payment Collection
          </h2>
          <p className="text-yellow-700">
            No payment collection found for this cart.
          </p>
        </div>
      </div>
    );
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "not_paid":
        return "bg-red-100 text-red-800 border-red-200";
      case "awaiting":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "authorized":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "partially_authorized":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "canceled":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      {/* Raw Data (Debug) */}
      <details>
        <summary className="cursor-pointer text-gray-500 text-sm">
          Raw Cart Collection Data (for debugging)
        </summary>
        <pre className="mt-2 overflow-auto rounded bg-gray-100 p-4 text-xs">
          {JSON.stringify(cart, null, 2)}
        </pre>
      </details>

      <div className="border-b pb-4">
        <h1 className="font-bold text-3xl">Payment Collection</h1>
        <p className="mt-2 text-gray-600">Payment details for cart {cart.id}</p>
      </div>

      {/* Payment Collection Status */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-xl">Payment Status</h2>
          <span
            className={`rounded-full border px-3 py-1 font-medium text-sm ${getStatusBadgeColor(paymentCollection.status)}`}
          >
            {paymentCollection.status.replace("_", " ").toUpperCase()}
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block font-medium text-gray-700 text-sm">
              Payment Collection ID
            </label>
            <p className="mt-1 font-mono text-gray-900 text-sm">
              {paymentCollection.id}
            </p>
          </div>
          <div>
            <label className="block font-medium text-gray-700 text-sm">
              Currency
            </label>
            <p className="mt-1 text-gray-900">
              {paymentCollection.currency_code.toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Amount Details */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-xl">Amount Details</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border-blue-500 border-l-4 bg-blue-50 p-4">
            <label className="block font-medium text-blue-700 text-sm">
              Total Amount
            </label>
            <p className="mt-1 font-semibold text-blue-900 text-lg">
              {formatCurrency(
                paymentCollection.amount ?? 0,
                paymentCollection.currency_code,
              )}
            </p>
          </div>
          <div className="rounded-lg border-green-500 border-l-4 bg-green-50 p-4">
            <label className="block font-medium text-green-700 text-sm">
              Authorized Amount
            </label>
            <p className="mt-1 font-semibold text-green-900 text-lg">
              {formatCurrency(
                paymentCollection.authorized_amount ?? 0,
                paymentCollection.currency_code,
              )}
            </p>
          </div>
          <div className="rounded-lg border-purple-500 border-l-4 bg-purple-50 p-4">
            <label className="block font-medium text-purple-700 text-sm">
              Captured Amount
            </label>
            <p className="mt-1 font-semibold text-lg text-purple-900">
              {formatCurrency(
                paymentCollection.captured_amount ?? 0,
                paymentCollection.currency_code,
              )}
            </p>
          </div>
          <div className="rounded-lg border-orange-500 border-l-4 bg-orange-50 p-4">
            <label className="block font-medium text-orange-700 text-sm">
              Refunded Amount
            </label>
            <p className="mt-1 font-semibold text-lg text-orange-900">
              {formatCurrency(
                paymentCollection.refunded_amount ?? 0,
                paymentCollection.currency_code,
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Timestamps */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-xl">Timeline</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block font-medium text-gray-700 text-sm">
              Created At
            </label>
            <p className="mt-1 text-gray-900 text-sm">
              {dayjs(paymentCollection.created_at).format(
                "YYYY-MM-DD HH:mm:ss",
              )}
            </p>
          </div>
          <div>
            <label className="block font-medium text-gray-700 text-sm">
              Last Updated
            </label>
            <p className="mt-1 text-gray-900 text-sm">
              {dayjs(paymentCollection.updated_at).format(
                "YYYY-MM-DD HH:mm:ss",
              )}
            </p>
          </div>
          <div>
            <label className="block font-medium text-gray-700 text-sm">
              Completed At
            </label>
            <p className="mt-1 text-gray-900 text-sm">
              {dayjs(paymentCollection.completed_at).format(
                "YYYY-MM-DD HH:mm:ss",
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Sessions */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-xl">Payment Sessions</h2>
        {paymentCollection.payment_sessions &&
        paymentCollection.payment_sessions.length > 0 ? (
          <div className="space-y-3">
            {paymentCollection.payment_sessions.map(
              (session: any, index: number) => (
                <div
                  key={session.id || index}
                  className="rounded border bg-gray-50 p-4"
                >
                  <div className="grid gap-2 md:grid-cols-3">
                    <div>
                      <span className="font-medium text-gray-700 text-sm">
                        Provider:
                      </span>
                      <span className="ml-2 text-gray-900">
                        {session.provider_id || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 text-sm">
                        Status:
                      </span>
                      <span className="ml-2 text-gray-900">
                        {session.status || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 text-sm">
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

                  {/* Authorization button - only for providers that support it */}
                  {shouldShowAuthorizeButton(session.provider_id) &&
                    session.id && (
                      <div className="mt-3 border-gray-200 border-t pt-3">
                        <div className="flex items-center justify-between">
                          <div className="text-gray-600 text-sm">
                            Session ID:{" "}
                            <span className="font-mono text-xs">
                              {session.id}
                            </span>
                          </div>
                          <button
                            onClick={() => handleAuthorizeSession(session.id)}
                            disabled={
                              authorizeSessionMutation.isPending ||
                              session.status === "authorized"
                            }
                            className="rounded-md bg-green-600 px-3 py-1 font-medium text-sm text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400"
                          >
                            {authorizeSessionMutation.isPending ? (
                              <span className="flex items-center">
                                <svg
                                  className="mr-1 h-3 w-3 animate-spin"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v8H4z"
                                  />
                                </svg>
                                Authorizing...
                              </span>
                            ) : session.status === "authorized" ? (
                              "Authorized"
                            ) : (
                              "Authorize Session"
                            )}
                          </button>
                        </div>

                        {/* Authorization feedback */}
                        {authorizeSessionMutation.isError && (
                          <div className="mt-2 rounded border border-red-200 bg-red-50 p-2">
                            <p className="text-red-700 text-xs">
                              Failed to authorize payment session. Please try
                              again.
                            </p>
                          </div>
                        )}

                        {authorizeSessionMutation.isSuccess && (
                          <div className="mt-2 rounded border border-green-200 bg-green-50 p-2">
                            <p className="text-green-700 text-xs">
                              Payment session authorized successfully!
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              ),
            )}
          </div>
        ) : (
          <p className="text-gray-500">No payment sessions found</p>
        )}
      </div>

      {/* Payment Provider Selection */}
      <PaymentSession
        paymentCollectionId={paymentCollection.id}
        regionId={regionId}
        cartId={cartId}
        hasHydrated={hasHydrated}
      />
    </div>
  );
};

export default PaymentCollection;
