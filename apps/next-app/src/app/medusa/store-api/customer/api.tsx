import type {
  StoreCustomerAddressListResponse,
  StoreCustomerResponse,
} from "@medusajs/types";
import api from "../../axios-error-handling-for-medusa/axios-client";

export async function getMe() {
  const data = await api.get<StoreCustomerResponse>(`/store/customers/me`);
  return data;
}

/** Returns current customer or `null` when session is guest (401). */
export async function getMeOrNull(): Promise<StoreCustomerResponse | null> {
  try {
    return await getMe();
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "AUTH.UNAUTHORIZED") {
      return null;
    }
    throw e;
  }
}

export async function getMyAddresses() {
  const data = await api.get<StoreCustomerAddressListResponse>(
    `/store/customers/me/addresses`,
  );
  return data;
}
