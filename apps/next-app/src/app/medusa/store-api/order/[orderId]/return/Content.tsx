"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { StoreOrderLineItem } from "@medusajs/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { Alert } from "@/app/medusa/components/Alert";
import { Card } from "@/app/medusa/components/Card";
import { PageHeading } from "@/app/medusa/components/PageHeading";
import { PixelSurface } from "@/app/medusa/components/PixelSurface";
import { StoreApiScaffold } from "@/app/medusa/components/StoreApiScaffold";
import { TextInput } from "@/app/medusa/components/TextInput";
import {
  getOrder,
  type StoreOrderWithCartId,
} from "@/app/medusa/store-api/order/api";
import {
  createReturn,
  getReturnReasons,
  getReturnShippingOptions,
} from "@/app/medusa/store-api/returns/api";
import { cn } from "@/lib/utils";

const selectClassName = cn(
  "relative block w-full appearance-none border border-gray-300 bg-white px-3 py-2 text-gray-900",
  "focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm rounded-md",
);

type ContentProps = {
  orderId: string;
  itemId: string | undefined;
  cartIdFromQuery: string | undefined;
};

type FormValues = {
  reason_id: string;
  quantity: number;
  return_shipping_option_id: string;
  item_note: string;
  return_note: string;
};

function buildSchema(maxQty: number) {
  const q = Math.max(1, maxQty);
  return z.object({
    reason_id: z.string().min(1, "Select a return reason"),
    quantity: z.coerce
      .number()
      .int()
      .min(1)
      .max(q, `Quantity cannot exceed ${q}`),
    return_shipping_option_id: z
      .string()
      .min(1, "Select a return shipping method"),
    item_note: z.string().optional(),
    return_note: z.string().optional(),
  });
}

type ReturnRequestFormProps = {
  order: StoreOrderWithCartId;
  lineItem: StoreOrderLineItem;
  orderId: string;
  cartIdFromQuery: string | undefined;
  reasons: { id: string; label: string }[];
  reasonsLoading: boolean;
};

function ReturnRequestForm({
  order,
  lineItem,
  orderId,
  cartIdFromQuery,
  reasons,
  reasonsLoading,
}: ReturnRequestFormProps) {
  const maxQty = lineItem.quantity ?? 1;
  const schema = useMemo(() => buildSchema(maxQty), [maxQty]);

  const resolvedCartId = useMemo(() => {
    if (typeof order.cart_id === "string" && order.cart_id.length > 0) {
      return order.cart_id;
    }
    if (typeof cartIdFromQuery === "string" && cartIdFromQuery.length > 0) {
      return cartIdFromQuery;
    }
    if (
      order.metadata &&
      typeof order.metadata.cart_id === "string" &&
      order.metadata.cart_id.length > 0
    ) {
      return order.metadata.cart_id;
    }
    return "";
  }, [order, cartIdFromQuery]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      reason_id: "",
      quantity: 1,
      return_shipping_option_id: "",
      item_note: "",
      return_note: "",
    },
  });

  const shippingOptionsQuery = useQuery({
    queryKey: ["store", "return-shipping-options", resolvedCartId],
    queryFn: () => getReturnShippingOptions(resolvedCartId.trim()),
    enabled: resolvedCartId.trim().length > 0,
  });

  const returnMutation = useMutation({
    mutationFn: createReturn,
  });

  const shippingOptions = shippingOptionsQuery.data?.shipping_options ?? [];

  const onSubmit = form.handleSubmit(async (values) => {
    await returnMutation.mutateAsync({
      order_id: orderId,
      items: [
        {
          id: lineItem.id,
          quantity: values.quantity,
          reason_id: values.reason_id || null,
          note: values.item_note.trim() ? values.item_note : null,
        },
      ],
      return_shipping: {
        option_id: values.return_shipping_option_id,
      },
      note: values.return_note.trim() ? values.return_note : null,
    });
  });

  return (
    <>
      <PageHeading
        title="Request return"
        description={`Order #${order.display_id ?? order.id.slice(0, 8)} · ${lineItem.title || lineItem.product_title}`}
      />

      <p className="mb-6 text-gray-600 text-sm">
        Submits <span className="font-mono">POST /store/returns</span> with the
        line item below. Return shipping options use{" "}
        <span className="font-mono">GET /store/shipping-options</span> (
        <span className="font-mono">is_return=true</span>) with the linked cart
        id from <span className="font-mono">GET /store-api/orders/:id</span>.
      </p>

      {resolvedCartId.length === 0 && (
        <Alert
          title="No cart linked to this order"
          variant="warning"
          appearance="pixel"
          className="mb-6"
        >
          Return shipping options could not be loaded. The order may have been
          created outside the usual checkout flow.
        </Alert>
      )}

      {returnMutation.isSuccess && returnMutation.data?.return && (
        <Alert title="Return created" variant="success" appearance="pixel">
          Return ID:{" "}
          <span className="font-mono">{returnMutation.data.return.id}</span>
        </Alert>
      )}

      {returnMutation.isError && (
        <Alert title="Request failed" variant="error" appearance="pixel">
          {returnMutation.error instanceof Error
            ? returnMutation.error.message
            : "Unknown error"}
        </Alert>
      )}

      <Card variant="pixel" className="space-y-5 p-6">
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="return-reason"
              className="mb-1 block font-semibold text-gray-800 text-sm"
            >
              Return reason
            </label>
            <Controller
              name="reason_id"
              control={form.control}
              render={({ field }) => (
                <select
                  {...field}
                  id="return-reason"
                  className={selectClassName}
                  disabled={reasonsLoading || reasons.length === 0}
                >
                  <option value="">
                    {reasonsLoading ? "Loading reasons…" : "Select a reason"}
                  </option>
                  {reasons.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              )}
            />
            {form.formState.errors.reason_id && (
              <p className="mt-1 text-red-600 text-sm">
                {form.formState.errors.reason_id.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="quantity"
              className="mb-1 block font-semibold text-gray-800 text-sm"
            >
              Quantity (max {maxQty})
            </label>
            <TextInput
              id="quantity"
              type="number"
              min={1}
              max={maxQty}
              {...form.register("quantity", { valueAsNumber: true })}
            />
            {form.formState.errors.quantity && (
              <p className="mt-1 text-red-600 text-sm">
                {form.formState.errors.quantity.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="return-shipping"
              className="mb-1 block font-semibold text-gray-800 text-sm"
            >
              Return shipping
            </label>
            <Controller
              name="return_shipping_option_id"
              control={form.control}
              render={({ field }) => (
                <select
                  {...field}
                  id="return-shipping"
                  className={selectClassName}
                  disabled={
                    resolvedCartId.trim().length === 0 ||
                    shippingOptionsQuery.isLoading ||
                    shippingOptions.length === 0
                  }
                >
                  <option value="">
                    {resolvedCartId.trim().length === 0
                      ? "No linked cart for this order"
                      : shippingOptionsQuery.isLoading
                        ? "Loading options…"
                        : shippingOptions.length === 0
                          ? "No return options for this cart"
                          : "Select return shipping"}
                  </option>
                  {shippingOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              )}
            />
            {shippingOptionsQuery.isError &&
              resolvedCartId.trim().length > 0 && (
                <p className="mt-1 text-amber-800 text-sm">
                  {(shippingOptionsQuery.error as Error).message}
                </p>
              )}
            {form.formState.errors.return_shipping_option_id && (
              <p className="mt-1 text-red-600 text-sm">
                {form.formState.errors.return_shipping_option_id.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="item_note"
              className="mb-1 block font-semibold text-gray-800 text-sm"
            >
              Item note (optional)
            </label>
            <TextInput id="item_note" {...form.register("item_note")} />
          </div>

          <div>
            <label
              htmlFor="return_note"
              className="mb-1 block font-semibold text-gray-800 text-sm"
            >
              Return note (optional)
            </label>
            <TextInput id="return_note" {...form.register("return_note")} />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={
                returnMutation.isPending ||
                reasons.length === 0 ||
                resolvedCartId.trim().length === 0 ||
                shippingOptions.length === 0
              }
              className={cn(
                "rounded-none border-4 border-[#1e1b84] bg-[#4f46e5] px-5 py-[10px] font-bold font-sans text-white text-xs tracking-[1px]",
                "hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {returnMutation.isPending ? "Submitting…" : "Submit return"}
            </button>
            <Link
              href={`/medusa/store-api/order/${orderId}`}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-900 text-sm hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </>
  );
}

export const Content = ({ orderId, itemId, cartIdFromQuery }: ContentProps) => {
  const orderQuery = useQuery({
    queryKey: ["order", orderId, "return-form"],
    queryFn: () =>
      getOrder(orderId, {
        fields: "id,display_id,metadata,*items,*items.variant",
      }),
    enabled: !!itemId,
  });

  const reasonsQuery = useQuery({
    queryKey: ["store", "return-reasons"],
    queryFn: () => getReturnReasons(),
  });

  const order = orderQuery.data?.order;
  const lineItem = order?.items?.find((i) => i.id === itemId);

  if (!itemId) {
    return (
      <StoreApiScaffold maxWidth="narrow">
        <Alert title="Missing line item" variant="error" appearance="pixel">
          Open this page from order details using &quot;Request Return&quot; on
          a line item, or add{" "}
          <code className="font-mono text-sm">?itemId=...</code> to the URL.
        </Alert>
        <Link
          href={`/medusa/store-api/order/${orderId}`}
          className="mt-4 inline-block font-mono text-[#1e1b84] text-sm underline"
        >
          Back to order
        </Link>
      </StoreApiScaffold>
    );
  }

  if (orderQuery.isLoading) {
    return (
      <StoreApiScaffold maxWidth="narrow">
        <PixelSurface className="p-6" shadow="md">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/3 bg-stone-200" />
            <div className="h-64 bg-stone-200" />
          </div>
        </PixelSurface>
      </StoreApiScaffold>
    );
  }

  if (orderQuery.isError || !order) {
    return (
      <StoreApiScaffold maxWidth="narrow">
        <Alert title="Could not load order" variant="error" appearance="pixel">
          {orderQuery.error instanceof Error
            ? orderQuery.error.message
            : "Request failed"}
        </Alert>
      </StoreApiScaffold>
    );
  }

  if (!lineItem) {
    return (
      <StoreApiScaffold maxWidth="narrow">
        <Alert title="Line item not found" variant="error" appearance="pixel">
          This order has no line item with id{" "}
          <span className="font-mono">{itemId}</span>.
        </Alert>
        <Link
          href={`/medusa/store-api/order/${orderId}`}
          className="mt-4 inline-block font-mono text-[#1e1b84] text-sm underline"
        >
          Back to order
        </Link>
      </StoreApiScaffold>
    );
  }

  const reasons = reasonsQuery.data?.return_reasons ?? [];

  return (
    <StoreApiScaffold maxWidth="narrow">
      {reasonsQuery.isError && (
        <Alert
          title="Return reasons unavailable"
          variant="error"
          appearance="pixel"
          className="mb-6"
        >
          {(reasonsQuery.error as Error).message}
        </Alert>
      )}
      <ReturnRequestForm
        key={`${orderId}-${lineItem.id}`}
        cartIdFromQuery={cartIdFromQuery}
        lineItem={lineItem}
        order={order}
        orderId={orderId}
        reasons={reasons}
        reasonsLoading={reasonsQuery.isLoading}
      />
    </StoreApiScaffold>
  );
};
