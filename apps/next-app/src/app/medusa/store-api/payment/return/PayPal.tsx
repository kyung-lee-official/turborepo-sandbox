"use client";

import { useQuery } from "@tanstack/react-query";
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-blue-600 border-b-2"></div>
          <p className="text-gray-600">Loading payment status...</p>
        </div>
      </div>
    );
  }

  if (paymentStatusQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="mb-2 font-semibold text-gray-900 text-xl">Error</h2>
          <p className="text-gray-600">Error fetching payment status</p>
        </div>
      </div>
    );
  }

  const paymentData = paymentStatusQuery.data;

  // Extract key information from the PayPal response
  const paymentAmount =
    paymentData?.purchase_units?.[0]?.payments?.authorizations?.[0]?.amount;
  const payerInfo = paymentData?.payer;
  const shippingInfo = paymentData?.purchase_units?.[0]?.shipping;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Success Header */}
        <div className="mb-6 rounded-lg bg-white p-8 text-center shadow-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="mb-2 font-bold text-2xl text-gray-900">
            Payment Successful!
          </h1>
          <p className="mb-4 text-gray-600">
            Your PayPal payment has been processed successfully.
          </p>

          {/* Payment Summary */}
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="mb-1 text-gray-500 text-sm">Transaction ID</p>
              <p className="break-all font-mono text-gray-900 text-sm">
                {paymentData?.id}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="mb-1 text-gray-500 text-sm">Payer ID</p>
              <p className="break-all font-mono text-gray-900 text-sm">
                {payerInfo?.payer_id}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="mb-1 text-gray-500 text-sm">Amount</p>
              <p className="font-semibold text-gray-900 text-lg">
                ${paymentAmount?.value} {paymentAmount?.currency_code}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="mb-1 text-gray-500 text-sm">Status</p>
              <span
                className={`inline-flex rounded-full px-2 py-1 font-medium text-xs ${
                  paymentData?.status === "COMPLETED"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {paymentData?.status}
              </span>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="mb-1 text-gray-500 text-sm">Provider</p>
              <p className="font-medium text-gray-900 text-sm">PayPal</p>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        {payerInfo && (
          <div className="mb-6 rounded-lg bg-white shadow-md">
            <div className="border-gray-200 border-b px-6 py-4">
              <h2 className="font-semibold text-gray-900 text-lg">
                Payment Information
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-medium text-gray-900 text-sm">
                    Payer Details
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {payerInfo.name?.given_name} {payerInfo.name?.surname}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {payerInfo.email_address}
                  </p>
                  <p className="text-gray-500 text-sm">
                    ID: {payerInfo.payer_id}
                  </p>
                </div>
                {shippingInfo && (
                  <div>
                    <h3 className="mb-2 font-medium text-gray-900 text-sm">
                      Shipping Address
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {shippingInfo.name?.full_name}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {shippingInfo.address?.address_line_1}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {shippingInfo.address?.admin_area_2},{" "}
                      {shippingInfo.address?.admin_area_1}{" "}
                      {shippingInfo.address?.postal_code}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Raw Payment Data */}
        <div className="rounded-lg bg-white shadow-md">
          <div className="border-gray-200 border-b px-6 py-4">
            <h2 className="font-semibold text-gray-900 text-lg">
              Transaction Details
            </h2>
            <p className="text-gray-600 text-sm">
              Complete PayPal response data
            </p>
          </div>
          <details className="p-6">
            <summary className="cursor-pointer font-medium text-gray-900 hover:text-gray-700">
              View Raw Data
            </summary>
            <pre className="mt-4 overflow-x-auto rounded-lg bg-gray-50 p-4 text-gray-800 text-xs leading-relaxed">
              {JSON.stringify(paymentData, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
};

export default PayPal;
