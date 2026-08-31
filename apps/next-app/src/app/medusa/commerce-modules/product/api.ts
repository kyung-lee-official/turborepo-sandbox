import type { FetcherOptions } from "@/lib/fetcher";
import { del, get, post, put } from "@/lib/fetcher";

export enum ProductQK {
  GET_PRODUCT_LIST = "get-product-list",
  GET_PRODUCT_BY_ID = "get-product-by-id",
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

export async function createProducts(data: unknown) {
  return post(`/commerce-modules/product`, data, medusaOptions());
}

export async function publishProduct(productId: string) {
  return put(
    `/commerce-modules/product/publish/${productId}`,
    {},
    medusaOptions(),
  );
}

export async function getProductList() {
  return get(`/commerce-modules/product`, medusaOptions());
}

export async function softDeleteProduct(productId: string) {
  return del(
    `/commerce-modules/product/soft-delete/${productId}`,
    medusaOptions(),
  );
}

export async function deleteProduct(productId: string) {
  return del(`/commerce-modules/product/${productId}`, medusaOptions());
}

export async function getProductById(productId: string, regionId: string) {
  return get(`/commerce-modules/product/${productId}`, {
    ...medusaOptions(),
    params: { region_id: regionId },
  });
}
