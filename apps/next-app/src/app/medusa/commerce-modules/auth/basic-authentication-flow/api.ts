import type { FetcherOptions } from "@/lib/fetcher";
import { del, get, post } from "@/lib/fetcher";

export enum TesterQK {
  GET_TESTER_LIST = "get-tester-list",
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

export async function getRegistrationAuthenticationToken(
  email: string,
  password: string,
  actor_type: string,
) {
  return post(
    `/auth/${actor_type}/emailpass/register`,
    { email, password },
    medusaOptions(),
  );
}

export async function loginTester(email: string, password: string) {
  return post(`/auth/tester/emailpass`, { email, password }, medusaOptions());
}

export async function registerTester(
  token: string,
  firstName: string,
  lastName: string,
  email: string,
  avatar_url?: string,
) {
  return post(
    `/tester`,
    {
      first_name: firstName,
      last_name: lastName,
      email: email,
      avatar_url: avatar_url,
    },
    medusaOptions(token),
  );
}

export const getTesterList = async () => {
  return get(`/tester`, medusaOptions());
};

export const deleteTester = async (testerId: string) => {
  return del(`/tester/${testerId}`, medusaOptions());
};
