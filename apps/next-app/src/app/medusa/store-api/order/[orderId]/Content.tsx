"use client";

import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Alert } from "@/app/medusa/components/Alert";
import { Card } from "@/app/medusa/components/Card";
import { PageHeading } from "@/app/medusa/components/PageHeading";
import { PixelSurface } from "@/app/medusa/components/PixelSurface";
import { StoreApiScaffold } from "@/app/medusa/components/StoreApiScaffold";
import { formatCurrency } from "@/utils/currency";
import { getOrder } from "../api";

type ContentProps = {
  orderId: string;
};

const Content = ({ orderId }: ContentProps) => {
  const orderQuery = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getOrder(orderId),
  });

  if (orderQuery.isLoading) {
    return (
      <StoreApiScaffold maxWidth="narrow">
        <PixelSurface className="p-6" shadow="md">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/3 bg-stone-200" />
            <div className="h-4 w-1/4 bg-stone-200" />
            <div className="h-64 bg-stone-200" />
          </div>
        </PixelSurface>
      </StoreApiScaffold>
    );
  }

  if (orderQuery.isError) {
    return (
      <StoreApiScaffold maxWidth="narrow">
        <Alert title="Error loading order" variant="error" appearance="pixel">
          {orderQuery.error instanceof Error
            ? orderQuery.error.message
            : "Failed to load order details"}
        </Alert>
      </StoreApiScaffold>
    );
  }

  const order = orderQuery.data?.order;
  if (!order) {
    return (
      <StoreApiScaffold maxWidth="narrow">
        <p className="text-gray-600">No order data available</p>
      </StoreApiScaffold>
    );
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "border border-amber-800 bg-amber-100 text-amber-950 shadow-[2px_2px_0_0_#78350f]";
      case "completed":
        return "border border-green-800 bg-green-100 text-green-900 shadow-[2px_2px_0_0_#14532d]";
      case "canceled":
        return "border border-red-800 bg-red-100 text-red-900 shadow-[2px_2px_0_0_#450a0a]";
      case "requires_action":
        return "border border-orange-800 bg-orange-100 text-orange-950 shadow-[2px_2px_0_0_#7c2d12]";
      default:
        return "border border-gray-600 bg-gray-100 text-gray-900 shadow-[2px_2px_0_0_#0f172a]";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "captured":
        return "border border-green-800 bg-green-100 text-green-900 shadow-[2px_2px_0_0_#14532d]";
      case "awaiting":
        return "border border-amber-800 bg-amber-100 text-amber-950 shadow-[2px_2px_0_0_#78350f]";
      case "not_paid":
        return "border border-red-800 bg-red-100 text-red-900 shadow-[2px_2px_0_0_#450a0a]";
      case "refunded":
        return "border border-purple-800 bg-purple-100 text-purple-900 shadow-[2px_2px_0_0_#4c1d95]";
      default:
        return "border border-gray-600 bg-gray-100 text-gray-900 shadow-[2px_2px_0_0_#0f172a]";
    }
  };

  const getFulfillmentStatusColor = (status: string) => {
    switch (status) {
      case "fulfilled":
        return "border border-green-800 bg-green-100 text-green-900 shadow-[2px_2px_0_0_#14532d]";
      case "partially_fulfilled":
        return "border border-amber-800 bg-amber-100 text-amber-950 shadow-[2px_2px_0_0_#78350f]";
      case "not_fulfilled":
        return "border border-red-800 bg-red-100 text-red-900 shadow-[2px_2px_0_0_#450a0a]";
      case "shipped":
        return "border border-blue-800 bg-blue-100 text-blue-900 shadow-[2px_2px_0_0_#1e3a8a]";
      default:
        return "border border-gray-600 bg-gray-100 text-gray-900 shadow-[2px_2px_0_0_#0f172a]";
    }
  };

  return (
    <StoreApiScaffold maxWidth="narrow">
      <details className="mb-6">
        <summary className="cursor-pointer font-mono text-gray-600 text-sm underline decoration-[#1e1b84] decoration-2 underline-offset-2">
          Raw order JSON (debug)
        </summary>
        <PixelSurface className="mt-3 overflow-auto p-4" shadow="sm">
          <pre className="font-mono text-xs text-gray-800">
            {JSON.stringify(order, null, 2)}
          </pre>
        </PixelSurface>
      </details>

      <PageHeading
        title="Order details"
        description={`Order #${order.display_id || order.id}`}
      />

      <div className="mt-8 space-y-8">
        <Card variant="pixel" className="max-w-none space-y-4 p-6">
          <h2 className="font-bold text-gray-900 text-xl">Order status</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="mb-2 font-semibold text-gray-700 text-sm">
                Order status
              </p>
              <span
                className={`inline-flex rounded-none px-3 py-1 font-semibold text-sm ${getStatusBadgeColor(order.status)}`}
              >
                {order.status.replace("_", " ").toUpperCase()}
              </span>
            </div>
            <div>
              <p className="mb-2 font-semibold text-gray-700 text-sm">
                Payment status
              </p>
              <span
                className={`inline-flex rounded-none px-3 py-1 font-semibold text-sm ${getPaymentStatusColor(order.payment_status)}`}
              >
                {order.payment_status.replace("_", " ").toUpperCase()}
              </span>
            </div>
            <div>
              <p className="mb-2 font-semibold text-gray-700 text-sm">
                Fulfillment status
              </p>
              <span
                className={`inline-flex rounded-none px-3 py-1 font-semibold text-sm ${getFulfillmentStatusColor(order.fulfillment_status)}`}
              >
                {order.fulfillment_status.replace("_", " ").toUpperCase()}
              </span>
            </div>
          </div>
        </Card>

        <Card variant="pixel" className="max-w-none space-y-4 p-6">
          <h2 className="font-bold text-gray-900 text-xl">Order information</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-semibold text-gray-700 text-sm">Order ID</p>
              <p className="mt-1 font-mono text-gray-900 text-sm">{order.id}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700 text-sm">Currency</p>
              <p className="mt-1 text-gray-900">
                {order.currency_code.toUpperCase()}
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-700 text-sm">Created</p>
              <p className="mt-1 text-gray-900 text-sm">
                {dayjs(order.created_at).format("YYYY-MM-DD HH:mm:ss")}
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-700 text-sm">Updated</p>
              <p className="mt-1 text-gray-900 text-sm">
                {dayjs(order.updated_at).format("YYYY-MM-DD HH:mm:ss")}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="pixel" className="max-w-none space-y-4 p-6">
          <h2 className="font-bold text-gray-900 text-xl">Order summary</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="border-l-4 border-blue-600 bg-blue-50 p-4 shadow-[4px_4px_0_0_#1e3a8a]">
              <p className="font-semibold text-blue-900 text-sm">Subtotal</p>
              <p className="mt-1 font-bold text-blue-950 text-lg">
                {formatCurrency(order.subtotal ?? 0, order.currency_code)}
              </p>
            </div>
            <div className="border-l-4 border-green-600 bg-green-50 p-4 shadow-[4px_4px_0_0_#14532d]">
              <p className="font-semibold text-green-900 text-sm">Tax total</p>
              <p className="mt-1 font-bold text-green-950 text-lg">
                {formatCurrency(order.tax_total ?? 0, order.currency_code)}
              </p>
            </div>
            <div className="border-l-4 border-purple-600 bg-purple-50 p-4 shadow-[4px_4px_0_0_#4c1d95]">
              <p className="font-semibold text-purple-900 text-sm">Shipping</p>
              <p className="mt-1 font-bold text-lg text-purple-950">
                {formatCurrency(order.shipping_total ?? 0, order.currency_code)}
              </p>
            </div>
            <div className="border-l-4 border-orange-600 bg-orange-50 p-4 shadow-[4px_4px_0_0_#7c2d12]">
              <p className="font-semibold text-orange-900 text-sm">Total</p>
              <p className="mt-1 font-bold text-lg text-orange-950">
                {formatCurrency(order.total ?? 0, order.currency_code)}
              </p>
            </div>
          </div>
        </Card>

        {order.items && order.items.length > 0 && (
          <Card variant="pixel" className="max-w-none space-y-4 p-6">
            <h2 className="font-bold text-gray-900 text-xl">Order items</h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <PixelSurface key={item.id} shadow="sm" className="p-4">
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {item.title || item.product_title}
                      </h3>
                      {item.variant_title && (
                        <p className="text-gray-600 text-sm">
                          {item.variant_title}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-4 text-gray-600 text-sm">
                        <span>Qty: {item.quantity}</span>
                        <span>
                          Unit:{" "}
                          {formatCurrency(
                            item.unit_price ?? 0,
                            order.currency_code,
                          )}
                        </span>
                      </div>
                    </div>
                    <p className="shrink-0 font-bold text-gray-900">
                      {formatCurrency(
                        (item.unit_price ?? 0) * (item.quantity ?? 1),
                        order.currency_code,
                      )}
                    </p>
                  </div>
                </PixelSurface>
              ))}
            </div>
          </Card>
        )}

        {order.customer && (
          <Card variant="pixel" className="max-w-none space-y-4 p-6">
            <h2 className="font-bold text-gray-900 text-xl">Customer</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="font-semibold text-gray-700 text-sm">Email</p>
                <p className="mt-1 text-gray-900">
                  {order.customer.email || order.email}
                </p>
              </div>
              {(order.customer.first_name || order.customer.last_name) && (
                <div>
                  <p className="font-semibold text-gray-700 text-sm">Name</p>
                  <p className="mt-1 text-gray-900">
                    {[order.customer.first_name, order.customer.last_name]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </StoreApiScaffold>
  );
};

export default Content;
