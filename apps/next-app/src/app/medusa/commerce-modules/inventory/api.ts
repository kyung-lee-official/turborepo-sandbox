import type { FetcherOptions } from "@/lib/fetcher";
import { get } from "@/lib/fetcher";

export enum InventoryQK {
  GET_INVENTORY_LIST = "get_inventory_list",
  GET_INVENTORY_BY_ID = "get_inventory_by_id",
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

export const getInventoryList = async () => {
  return get(`/commerce-modules/inventory`, medusaOptions());
};

export const getInventoryById = async (inventoryId: string) => {
  return get(`/commerce-modules/inventory/${inventoryId}`, medusaOptions());
};
