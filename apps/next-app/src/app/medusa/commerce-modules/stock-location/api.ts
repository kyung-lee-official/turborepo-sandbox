import type { FetcherOptions } from "@/lib/fetcher";
import { del, get, post } from "@/lib/fetcher";

export enum StockLocationQK {
  GET_STOCK_LOCATION_LIST = "get-stock-location-list",
  GET_STOCK_LOCATION_BY_ID = "get-stock-location-by-id",
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

export const getStockLocationList = async () => {
  return get(`/commerce-modules/stock-location`, medusaOptions());
};

export const createStockLocation = async (name: string) => {
  return post(
    `/commerce-modules/stock-location`,
    { name: name },
    medusaOptions(),
  );
};

export const getStockLocationById = async (stockLocationId: string) => {
  return get(
    `/commerce-modules/stock-location/${stockLocationId}`,
    medusaOptions(),
  );
};

export const deleteStockLocation = async (stockLocationId: string) => {
  return del(
    `/commerce-modules/stock-location/${stockLocationId}`,
    medusaOptions(),
  );
};
