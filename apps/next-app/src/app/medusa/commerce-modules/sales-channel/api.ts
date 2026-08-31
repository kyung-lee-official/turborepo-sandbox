import type { FetcherOptions } from "@/lib/fetcher";
import { del, get } from "@/lib/fetcher";

export enum SalesChannelQK {
  GET_SALES_CHANNEL_LIST = "get-sales-channel-list",
  GET_STOCK_LOCATIONS_BY_SALES_CHANNEL_ID = "get-stock-locations-by-sales-channel-id",
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

export const getSalesChannelList = async () => {
  return get(`/commerce-modules/sales-channel`, medusaOptions());
};

export const deleteSalesChannel = async (salesChannelId: string) => {
  return del(
    `/commerce-modules/sales-channel/${salesChannelId}`,
    medusaOptions(),
  );
};

export const getStockLocationsBySalesChannelId = async (
  salesChannelId: string,
) => {
  return get(
    `/commerce-modules/sales-channel/stock-locations/${salesChannelId}`,
    medusaOptions(),
  );
};
