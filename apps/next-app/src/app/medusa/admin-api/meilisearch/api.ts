import http from "../../axios-error-handling-for-medusa/axios-client";

const BASE = "/admin/meilisearch/management";

export enum QK_MEILISEARCH_ADMIN {
  TASKS = "meilisearch_admin_tasks",
  INDEXES = "meilisearch_admin_indexes",
  EMBEDDERS = "meilisearch_admin_embedders",
  DOCUMENTS = "meilisearch_admin_documents",
}

export async function getMeilisearchTasks() {
  return await http.get<Record<string, unknown>>(`${BASE}/tasks`);
}

export async function getMeilisearchIndexes(params?: {
  limit?: number;
  offset?: number;
}) {
  return await http.get<Record<string, unknown>>(`${BASE}/indexes`, {
    params,
  });
}

export async function createMeilisearchIndex(body: {
  uid: string;
  primaryKey?: string;
}) {
  return await http.post<Record<string, unknown>>(`${BASE}/indexes`, body);
}

export async function getMeilisearchEmbedders(indexUid: string) {
  return await http.get<Record<string, unknown>>(
    `${BASE}/indexes/${encodeURIComponent(indexUid)}/embedders`,
  );
}

export async function patchMeilisearchEmbedders(
  indexUid: string,
  body: Record<string, unknown>,
) {
  return await http.patch<Record<string, unknown>>(
    `${BASE}/indexes/${encodeURIComponent(indexUid)}/embedders`,
    body,
  );
}

export async function deleteMeilisearchEmbedders(indexUid: string) {
  return await http.del<Record<string, unknown>>(
    `${BASE}/indexes/${encodeURIComponent(indexUid)}/embedders`,
  );
}

export async function getMeilisearchDocuments(
  indexUid: string,
  params?: {
    limit?: number;
    offset?: number;
    fields?: string;
    filter?: string;
    retrieveVectors?: boolean;
  },
) {
  return await http.get<Record<string, unknown>>(
    `${BASE}/indexes/${encodeURIComponent(indexUid)}/documents`,
    { params },
  );
}

export async function postMeilisearchDocuments(
  indexUid: string,
  body: Record<string, unknown>[],
) {
  return await http.post<Record<string, unknown>>(
    `${BASE}/indexes/${encodeURIComponent(indexUid)}/documents`,
    body,
  );
}

export async function deleteAllMeilisearchDocuments(indexUid: string) {
  return await http.del<Record<string, unknown>>(
    `${BASE}/indexes/${encodeURIComponent(indexUid)}/documents`,
  );
}
