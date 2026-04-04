"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/app/medusa/components/Card";
import { PageHeading } from "@/app/medusa/components/PageHeading";
import { PixelSurface } from "@/app/medusa/components/PixelSurface";
import { StoreApiScaffold } from "@/app/medusa/components/StoreApiScaffold";
import { cn } from "@/lib/utils";
import { retrievePayment } from "../api";

type PayPalProps = {
  token: string;
  PayerID: string;
};

const PayPal = ({ token, PayerID }: PayPalProps) => {
  const paymentStatusQuery = useQuery({
    queryKey: ["paymentStatus", token, PayerID],
    queryFn: async () => retrievePayment({ token, PayerID }),
  });

  if (paymentStatusQuery.isLoading) {
    return (
      <StoreApiScaffold>
        <Card variant="pixel" className="mx-auto max-w-md space-y-4 p-8 text-center">
          <div
            className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-[#4f46e5] border-b-4"
            aria-hidden
          />
          <p className="text-gray-700">Loading payment status…</p>
        </Card>
      </StoreApiScaffold>
    );
  }

  if (paymentStatusQuery.isError) {
    return (
      <StoreApiScaffold>
        <Card variant="pixel" className="mx-auto max-w-md space-y-4 p-8 text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border-2 border-[#7f1d1d] bg-red-100 shadow-[4px_4px_0_0_#450a0a]"
            aria-hidden
          >
            <span className="font-bold text-red-700 text-xl">×</span>
          </div>
          <h2 className="font-bold text-gray-900 text-xl">Error</h2>
          <p className="text-gray-600">Could not fetch payment status.</p>
        </Card>
      </StoreApiScaffold>
    );
  }

  const paymentData = paymentStatusQuery.data;

  const paymentAmount =
    paymentData?.purchase_units?.[0]?.payments?.authorizations?.[0]?.amount;
  const payerInfo = paymentData?.payer;
  const shippingInfo = paymentData?.purchase_units?.[0]?.shipping;

  return (
    <StoreApiScaffold>
      <PageHeading
        title="PayPal payment"
        description="Return handler — payment processed."
      />

      <div className="mt-8 space-y-8">
        <Card variant="pixel" className="max-w-none space-y-6 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center border-2 border-green-800 bg-green-100 shadow-[8px_8px_0_0_#14532d]">
            <span className="font-bold text-2xl text-green-800">✓</span>
          </div>
          <h2 className="font-bold text-2xl text-gray-900">Payment successful</h2>
          <p className="text-gray-600">
            Your PayPal payment was processed successfully.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 text-left md:grid-cols-2">
            <PixelSurface shadow="sm" className="p-4">
              <p className="mb-1 font-semibold text-gray-600 text-sm">
                Transaction ID
              </p>
              <p className="break-all font-mono text-gray-900 text-sm">
                {paymentData?.id}
              </p>
            </PixelSurface>
            <PixelSurface shadow="sm" className="p-4">
              <p className="mb-1 font-semibold text-gray-600 text-sm">Payer ID</p>
              <p className="break-all font-mono text-gray-900 text-sm">
                {payerInfo?.payer_id}
              </p>
            </PixelSurface>
          </div>

          <div className="grid grid-cols-1 gap-4 text-left md:grid-cols-3">
            <PixelSurface shadow="sm" className="p-4">
              <p className="mb-1 font-semibold text-gray-600 text-sm">Amount</p>
              <p className="font-bold text-gray-900 text-lg">
                ${paymentAmount?.value} {paymentAmount?.currency_code}
              </p>
            </PixelSurface>
            <PixelSurface shadow="sm" className="p-4">
              <p className="mb-1 font-semibold text-gray-600 text-sm">Status</p>
              <span
                className={cn(
                  "inline-block rounded-none border px-2 py-1 font-semibold text-xs shadow-[2px_2px_0_0_#0f172a]",
                  paymentData?.status === "COMPLETED"
                    ? "border-green-800 bg-green-100 text-green-900"
                    : "border-amber-800 bg-amber-100 text-amber-950",
                )}
              >
                {paymentData?.status}
              </span>
            </PixelSurface>
            <PixelSurface shadow="sm" className="p-4">
              <p className="mb-1 font-semibold text-gray-600 text-sm">Provider</p>
              <p className="font-semibold text-gray-900 text-sm">PayPal</p>
            </PixelSurface>
          </div>
        </Card>

        {payerInfo && (
          <Card variant="pixel" className="max-w-none space-y-4 p-6">
            <h2 className="border-b-2 border-[#1e1b84] pb-2 font-bold text-gray-900 text-lg shadow-[0_4px_0_0_#0f172a]">
              Payer & shipping
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-2 font-semibold text-gray-800 text-sm">
                  Payer
                </h3>
                <p className="text-gray-700 text-sm">
                  {payerInfo.name?.given_name} {payerInfo.name?.surname}
                </p>
                <p className="text-gray-700 text-sm">{payerInfo.email_address}</p>
                <p className="text-gray-500 text-sm">ID: {payerInfo.payer_id}</p>
              </div>
              {shippingInfo && (
                <div>
                  <h3 className="mb-2 font-semibold text-gray-800 text-sm">
                    Shipping
                  </h3>
                  <p className="text-gray-700 text-sm">
                    {shippingInfo.name?.full_name}
                  </p>
                  <p className="text-gray-700 text-sm">
                    {shippingInfo.address?.address_line_1}
                  </p>
                  <p className="text-gray-700 text-sm">
                    {shippingInfo.address?.admin_area_2},{" "}
                    {shippingInfo.address?.admin_area_1}{" "}
                    {shippingInfo.address?.postal_code}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        <Card variant="pixel" className="max-w-none space-y-4 p-6">
          <h2 className="font-bold text-gray-900 text-lg">Raw PayPal response</h2>
          <details>
            <summary className="cursor-pointer font-semibold text-gray-800">
              View JSON
            </summary>
            <PixelSurface className="mt-4 overflow-auto p-4" shadow="sm">
              <pre className="font-mono text-xs text-gray-800 leading-relaxed">
                {JSON.stringify(paymentData, null, 2)}
              </pre>
            </PixelSurface>
          </details>
        </Card>
      </div>
    </StoreApiScaffold>
  );
};

export default PayPal;
