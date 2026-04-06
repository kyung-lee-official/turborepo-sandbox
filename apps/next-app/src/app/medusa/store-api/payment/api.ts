import {
  StorePaymentCollectionResponse,
  StorePaymentProviderListResponse,
} from "@medusajs/types";
import api from "../../axios-error-handling-for-medusa/axios-client";

export type CreatePaymentSessionsForCartResponse = {
  payment_collection_id: string;
  payment_sessions: unknown;
};

export async function createPaymentSessionsForCart(body: {
  cart_id: string;
  provider_id: string;
  data?: { intent: "CAPTURE" };
}) {
  const data = await api.post<CreatePaymentSessionsForCartResponse>(
    `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store-api/payment-sessions`,
    body,
  );
  return data;
}

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
