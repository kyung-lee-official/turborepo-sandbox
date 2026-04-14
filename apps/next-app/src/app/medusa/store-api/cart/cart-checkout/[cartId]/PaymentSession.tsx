"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "@/app/medusa/components/Alert";
import { Button } from "@/app/medusa/components/Button";
import { Card } from "@/app/medusa/components/Card";
import { listPaymentProviders } from "../../../payment/api";
import { QK_CART } from "../../api";
import {
  OCEAN_HOSTED_CHECKOUT_METHOD_OPTIONS,
  OCEAN_HOSTED_CHECKOUT_METHODS,
} from "../../../payment/ocean-hosted-methods";
import {
  getButtonText,
  getSuccessMessage,
  handlePostInitialization,
  initializeSession,
} from "./PaymentProviderService";

const OCEAN_PAYMENT_PROVIDER_ID = "pp_oceanpayment_oceanpayment";

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
  const [oceanHostedMethod, setOceanHostedMethod] = useState<string>(
    OCEAN_HOSTED_CHECKOUT_METHODS.CREDIT_CARD,
  );
  const queryClient = useQueryClient();

  const providersQuery = useQuery({
    queryKey: ["payment-providers", regionId],
    queryFn: () => listPaymentProviders(regionId!),
    enabled: hasHydrated && !!regionId,
  });

  const initializeSessionMutation = useMutation({
    mutationFn: async ({
      paymentCollectionId: pcId,
      providerId,
      sessionExtra,
    }: {
      paymentCollectionId: string;
      providerId: string;
      sessionExtra?: { methods?: string };
    }) => await initializeSession(pcId, providerId, sessionExtra),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QK_CART.GET_CART, cartId, regionId],
      });
      handlePostInitialization(data, variables.providerId);
    },
  });

  const handleCreatePaymentSession = async () => {
    if (!paymentCollectionId || !selectedProvider) return;
    try {
      await initializeSessionMutation.mutateAsync({
        paymentCollectionId,
        providerId: selectedProvider,
        sessionExtra:
          selectedProvider === OCEAN_PAYMENT_PROVIDER_ID
            ? { methods: oceanHostedMethod }
            : undefined,
      });
    } catch (error) {
      console.error("Failed to initialize payment session:", error);
    }
  };

  return (
    <Card variant="pixel" className="max-w-none space-y-4 p-6">
      <h2 className="font-bold text-gray-900 text-xl">
        Select payment provider
      </h2>
      {providersQuery.isLoading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-1/4 bg-stone-200" />
          <div className="h-10 bg-stone-200" />
        </div>
      ) : providersQuery.isError ? (
        <Alert title="Providers" variant="error" appearance="pixel">
          Failed to load payment providers.
        </Alert>
      ) : (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="payment-provider"
              className="mb-2 block font-semibold text-gray-800 text-sm"
            >
              Available providers
            </label>
            <select
              id="payment-provider"
              value={selectedProvider}
              onChange={(e) => {
                setSelectedProvider(e.target.value);
                setOceanHostedMethod(OCEAN_HOSTED_CHECKOUT_METHODS.CREDIT_CARD);
              }}
              className="w-full rounded-none border-2 border-[#1e1b84] bg-white px-3 py-2 font-sans text-gray-900 text-sm shadow-[4px_4px_0_0_#0f172a] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={initializeSessionMutation.isPending}
            >
              <option value="">Select a payment provider</option>
              {providersQuery.data?.payment_providers.map(
                (provider: { id: string; display_name?: string }) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.id}
                    {provider.display_name ? ` — ${provider.display_name}` : ""}
                  </option>
                ),
              )}
            </select>
          </div>

          {selectedProvider === OCEAN_PAYMENT_PROVIDER_ID && (
            <div>
              <label
                htmlFor="ocean-hosted-method"
                className="mb-2 block font-semibold text-gray-800 text-sm"
              >
                Ocean hosted checkout method
              </label>
              <select
                id="ocean-hosted-method"
                value={oceanHostedMethod}
                onChange={(e) => setOceanHostedMethod(e.target.value)}
                className="w-full rounded-none border-2 border-[#1e1b84] bg-white px-3 py-2 font-sans text-gray-900 text-sm shadow-[4px_4px_0_0_#0f172a] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={initializeSessionMutation.isPending}
              >
                {OCEAN_HOSTED_CHECKOUT_METHOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            type="button"
            variant="primary"
            disabled={
              !selectedProvider ||
              initializeSessionMutation.isPending ||
              !paymentCollectionId
            }
            onClick={handleCreatePaymentSession}
          >
            {initializeSessionMutation.isPending
              ? "Initializing…"
              : getButtonText(selectedProvider || "")}
          </Button>

          {initializeSessionMutation.isError && (
            <Alert title="Session" variant="error" appearance="pixel">
              Failed to initialize payment session. Try again.
            </Alert>
          )}

          {initializeSessionMutation.isSuccess && (
            <Alert title="Session" variant="success" appearance="pixel">
              {getSuccessMessage(selectedProvider)}
            </Alert>
          )}
        </div>
      )}
    </Card>
  );
};
