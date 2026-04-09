import http from "../../axios-error-handling-for-medusa/axios-client";

export type StoreSearchHit = Record<string, unknown>;

export type StoreSearchResponse = {
  query: string;
  hybrid?: { embedder: string; semanticRatio: number };
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
  hits: StoreSearchHit[];
  processingTimeMs?: number;
};

export enum QK_STORE_SEARCH {
  SEARCH = "store_api_search",
}

export async function getStoreSearch(params: {
  q: string;
  hybridEmbedder?: string;
}) {
  return await http.get<StoreSearchResponse>(`/store-api/search`, {
    params,
  });
}
