"use client";

import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import Link from "next/link";
import { Alert } from "@/app/medusa/components/Alert";
import { Card } from "@/app/medusa/components/Card";
import { PageHeading } from "@/app/medusa/components/PageHeading";
import { PixelSurface } from "@/app/medusa/components/PixelSurface";
import { StoreApiScaffold } from "@/app/medusa/components/StoreApiScaffold";
import { formatCurrency } from "@/utils/currency";
import { listOrders } from "./api";

export const Content = () => {
  const ordersQuery = useQuery({
    queryKey: ["store", "orders"],
    queryFn: () => listOrders(),
  });

  if (ordersQuery.isLoading) {
    return (
      <StoreApiScaffold>
        <PixelSurface className="p-6" shadow="md">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/3 bg-stone-200" />
            <div className="h-4 w-1/4 bg-stone-200" />
            <div className="h-32 bg-stone-200" />
          </div>
        </PixelSurface>
      </StoreApiScaffold>
    );
  }

  if (ordersQuery.isError) {
    return (
      <StoreApiScaffold>
        <PageHeading
          title="Orders"
          description="GET /store-api/orders — orders for the signed-in customer."
        />
        <Alert title="Could not load orders" variant="error" appearance="pixel">
          {ordersQuery.error instanceof Error
            ? ordersQuery.error.message
            : "Request failed. Sign in under Store API → Auth if you are not logged in."}
        </Alert>
      </StoreApiScaffold>
    );
  }

  const orders = ordersQuery.data?.orders ?? [];

  return (
    <StoreApiScaffold>
      <PageHeading
        title="Orders"
        description="GET /store-api/orders — orders for the signed-in customer."
      />

      <details className="group mb-8">
        <summary className="cursor-pointer font-mono text-gray-600 text-sm underline decoration-2 decoration-[#1e1b84] underline-offset-2">
          Raw response (debug)
        </summary>
        <PixelSurface className="mt-3 overflow-auto p-4" shadow="sm">
          <pre className="font-mono text-gray-800 text-xs">
            {JSON.stringify(ordersQuery.data, null, 2)}
          </pre>
        </PixelSurface>
      </details>

      {orders.length === 0 ? (
        <Card
          variant="pixel"
          className="mx-auto max-w-md space-y-4 p-8 text-center"
        >
          <div className="text-5xl text-gray-500" aria-hidden>
            📦
          </div>
          <h2 className="font-bold text-gray-800 text-xl">No orders yet</h2>
          <p className="text-gray-600">
            Place an order while signed in, or sign in under Store API → Auth to
            see your history.
          </p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <Card
                variant="pixel"
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-gray-900">
                    Order #{order.display_id ?? order.id.slice(0, 8)}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {dayjs(order.created_at).format("YYYY-MM-DD HH:mm")}
                  </p>
                  <p className="text-gray-700 text-sm capitalize">
                    {order.status.replaceAll("_", " ")} ·{" "}
                    {order.payment_status.replaceAll("_", " ")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
                  <p className="font-bold text-gray-900 text-lg">
                    {formatCurrency(order.total ?? 0, order.currency_code)}
                  </p>
                  <Link
                    href={`/medusa/store-api/order/${order.id}`}
                    className="font-mono text-[#1e1b84] text-sm underline decoration-2 underline-offset-2"
                  >
                    View details
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </StoreApiScaffold>
  );
};
