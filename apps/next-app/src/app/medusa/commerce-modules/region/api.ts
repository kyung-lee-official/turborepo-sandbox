import type { FetcherOptions } from "@/lib/fetcher";
import { get } from "@/lib/fetcher";

export enum RegionQK {
  GET_REGION_LIST = "get-region-list",
}

function medusaOptions(): Pick<FetcherOptions, "baseURL" | "headers"> {
  return {
    baseURL: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
    headers: {
      "x-publishable-api-key":
        process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "",
    },
  };
}

export async function getRegions() {
  return get(`/commerce-modules/region`, medusaOptions());
}
