import type { FetcherOptions } from "@/lib/fetcher";
import { del, get, post } from "@/lib/fetcher";

export enum UserQK {
  GET_USER_LIST = "get-user-list",
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

export async function inviteUser(email: string) {
  return post(`/commerce-modules/user/invite-user`, { email }, medusaOptions());
}

export async function registerUser(
  token: string,
  firstName: string,
  lastName: string,
  email: string,
  avatar_url?: string,
) {
  return post(
    `/commerce-modules/user/create-user`,
    {
      first_name: firstName,
      last_name: lastName,
      email: email,
      avatar_url: avatar_url,
    },
    medusaOptions(token),
  );
}

export async function loginUser(email: string, password: string) {
  return post(`/auth/user/emailpass`, { email, password }, medusaOptions());
}

export const getUserList = async () => {
  return get(`/commerce-modules/user`, medusaOptions());
};

export const deleteUser = async (userId: string) => {
  return del(`/commerce-modules/user/${userId}`, medusaOptions());
};
