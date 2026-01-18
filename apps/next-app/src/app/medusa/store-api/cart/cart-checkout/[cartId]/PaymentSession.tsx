"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listPaymentProviders } from "../../../payment/api";
import { QK_CART } from "../../api";
import {
  getButtonText,
  getSuccessMessage,
  handlePostInitialization,
  initializeSession,
} from "./PaymentProviderService";

type PaymentSessionProps = {
  paymentCollectionId: string;
  regionId: string;
  cartId: string;
  hasHydrated: boolean;
};

export const PaymentSession = ({
  paymentCollectionId,
  regionId,
  cartId,
  hasHydrated,
}: PaymentSessionProps) => {
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const queryClient = useQueryClient();

  const providersQuery = useQuery({
    queryKey: ["payment-providers", regionId],
    queryFn: () => listPaymentProviders(regionId!),
    enabled: hasHydrated && !!regionId,
  });

  const initializeSessionMutation = useMutation({
    mutationFn: async ({
      paymentCollectionId,
      providerId,
    }: {
      paymentCollectionId: string;
      providerId: string;
    }) => await initializeSession(paymentCollectionId, providerId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QK_CART.GET_CART, cartId, regionId],
      });

      // Handle provider-specific post-initialization logic
      handlePostInitialization(data, variables.providerId);
    },
  });

  const handleProviderSelect = async () => {
    if (!paymentCollectionId || !selectedProvider) return;

    try {
      await initializeSessionMutation.mutateAsync({
        paymentCollectionId,
        providerId: selectedProvider,
      });
    } catch (error) {
      console.error("Failed to initialize payment session:", error);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-semibold text-xl">Select Payment Provider</h2>
      {providersQuery.isLoading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-1/4 rounded bg-gray-200"></div>
          <div className="h-10 rounded bg-gray-200"></div>
        </div>
      ) : providersQuery.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-700">Failed to load payment providers</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block font-medium text-gray-700 text-sm">
              Available Payment Providers
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={initializeSessionMutation.isPending}
            >
              <option value="">Select a payment provider</option>
              {providersQuery.data?.payment_providers.map((provider: any) => (
                <option key={provider.id} value={provider.id}>
                  {provider.id}{" "}
                  {provider.display_name && `- ${provider.display_name}`}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleProviderSelect}
            disabled={
              !selectedProvider ||
              initializeSessionMutation.isPending ||
              !paymentCollectionId
            }
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {initializeSessionMutation.isPending ? (
              <span className="flex items-center">
                <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
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
                Initializing...
              </span>
            ) : (
              getButtonText(selectedProvider || "")
            )}
          </button>

          {initializeSessionMutation.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-red-700 text-sm">
                Failed to initialize payment session. Please try again.
              </p>
            </div>
          )}

          {initializeSessionMutation.isSuccess && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-green-700 text-sm">
                {getSuccessMessage(selectedProvider)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
