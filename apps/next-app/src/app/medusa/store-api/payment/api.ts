import {
  StorePaymentCollectionResponse,
  StorePaymentProviderListResponse,
} from "@medusajs/types";
import api from "../../axios-error-handling-for-medusa/axios-client";

export async function createPaymentCollection(cartId: string) {
  const data = await api.post<StorePaymentCollectionResponse>(
    `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store-api/payment/create-payment-collection`,
    {
      cart_id: cartId,
    },
  );
  return data;
}

export async function listPaymentProviders(regionId: string) {
  const data = await api.get<StorePaymentProviderListResponse>(
    `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/payment-providers?region_id=${regionId}`,
  );
  return data;
}

export async function initializeDefaultPaymentSession(
  paymentCollectionId: string,
  providerId: string,
) {
  const data = await api.post<StorePaymentCollectionResponse>(
    `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/payment-collections/${paymentCollectionId}/payment-sessions`,
    {
      provider_id: providerId,
    },
  );
  return data;
}

export async function initializePaymentSession(
  paymentCollectionId: string,
  providerId: string,
) {
  const data = await api.post<StorePaymentCollectionResponse>(
    `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store-api/payment/initialize-payment-session/${paymentCollectionId}`,
    {
      provider_id: providerId,
      data: {
        intent: "CAPTURE",
      },
    },
  );
  return data;
}

export async function retrievePayment(data: unknown) {
  const response = await api.post<any>(
    `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store-api/payment/retrieve-payment`,
    data,
  );
  return response.data;
}

export async function authorizePaymentSession(paymentSessionId: string) {
  const data = await api.post(
    `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/commerce-modules/payment/payment-session/authorize-payment-session/${paymentSessionId}`,
  );
  return data;
}
