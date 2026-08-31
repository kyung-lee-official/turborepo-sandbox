import type { FetcherOptions } from "@/lib/fetcher";
import { del, get, post } from "@/lib/fetcher";

export enum CustomerQK {
  GET_CUSTOMER_LIST = "get-customer-list",
  GET_CUSTOMER_BY_ID = "get-customer-by-id",
}

function medusaOptions(
  token?: string,
): Pick<FetcherOptions, "baseURL" | "headers"> {
  return {
    baseURL: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "x-publishable-api-key":
        process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "",
    },
  };
}

export async function registerCustomer(
  token: string,
  firstName: string,
  lastName: string,
  email: string,
  avatar_url?: string,
) {
  return post(
    `/commerce-modules/customer/create-customer`,
    {
      first_name: firstName,
      last_name: lastName,
      email: email,
      avatar_url: avatar_url,
    },
    medusaOptions(token),
  );
}

export async function loginCustomer(email: string, password: string) {
  return post(`/auth/customer/emailpass`, { email, password }, medusaOptions());
}

export const getCustomerList = async () => {
  return get(`/commerce-modules/customer`, medusaOptions());
};

export const getCustomerById = async (customerId: string) => {
  return get(`/commerce-modules/customer/${customerId}`, medusaOptions());
};

export const deleteCustomer = async (customerId: string) => {
  return del(`/commerce-modules/customer/${customerId}`, medusaOptions());
};

/* ==== addresses ==== */
export const addAddressToCustomer = async (
  customerId: string,
  addressData: Record<string, unknown>,
) => {
  return post(
    `/commerce-modules/customer/add-address-by-customer-id/${customerId}`,
    addressData,
    medusaOptions(),
  );
};

export const deleteAddressById = async (addressId: string) => {
  return del(
    `/commerce-modules/customer/delete-address-by-id/${addressId}`,
    medusaOptions(),
  );
};
