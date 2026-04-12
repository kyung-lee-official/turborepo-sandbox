const PUBLISHABLE_HEADER = "x-publishable-api-key";

/** Bun extends fetch with `tls`; keep local so tsc is happy without dom lib conflicts. */
type E2eFetchInit = RequestInit & {
  tls?: { rejectUnauthorized?: boolean };
};

/**
 * Use relaxed TLS for local HTTPS (self-signed / dev certs). Override with
 * `TEST_TLS_INSECURE=0` to enforce verification, or `TEST_TLS_INSECURE=1` to always allow insecure HTTPS.
 */
function insecureTlsForUrl(url: string): boolean {
  if (process.env.TEST_TLS_INSECURE === "0") {
    return false;
  }
  if (process.env.TEST_TLS_INSECURE === "1") {
    return true;
  }
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") {
      return false;
    }
    return (
      u.hostname === "localhost" ||
      u.hostname.endsWith(".local") ||
      u.hostname.startsWith("127.")
    );
  } catch {
    return false;
  }
}

export function e2eFetch(
  input: string | URL | Request,
  init: E2eFetchInit = {},
): Promise<Response> {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  if (!insecureTlsForUrl(url)) {
    return fetch(input, init);
  }
  return fetch(input, {
    ...init,
    tls: { rejectUnauthorized: false },
  });
}

type AdminApiKeyRow = {
  id?: string;
  type?: string;
  token?: string;
  revoked_at?: string | null;
  title?: string;
};

function originOf(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

async function adminFetch(
  baseUrl: string,
  path: string,
  adminJwt: string,
  init: RequestInit = {},
): Promise<Response> {
  const origin = originOf(baseUrl);
  const url = path.startsWith("http")
    ? path
    : `${origin}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${adminJwt}`);
  return e2eFetch(url, { ...init, headers });
}

/**
 * Official Medusa admin auth: JWT from `POST /auth/user/emailpass`.
 */
export async function loginAdminJwt(
  baseUrl: string,
  email: string,
  password: string,
): Promise<string> {
  const origin = originOf(baseUrl);
  const res = await e2eFetch(`${origin}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = (await res.json()) as { token?: string };
  if (!res.ok || !json.token) {
    throw new Error(
      `Admin login failed (${res.status}): ${JSON.stringify(json)}`,
    );
  }
  return json.token;
}

/**
 * List API keys (Medusa Admin API). Use `type=publishable` to scope publishable keys.
 */
export async function fetchAdminApiKeys(
  baseUrl: string,
  adminJwt: string,
  query: Record<string, string> = {},
): Promise<{ api_keys: AdminApiKeyRow[] }> {
  const origin = originOf(baseUrl);
  const params = new URLSearchParams(query);
  const res = await adminFetch(baseUrl, `/admin/api-keys?${params}`, adminJwt, {
    method: "GET",
  });
  const json = (await res.json()) as {
    api_keys?: AdminApiKeyRow[];
    message?: string;
  };
  if (!res.ok) {
    throw new Error(
      `GET /admin/api-keys failed (${res.status}): ${JSON.stringify(json)}`,
    );
  }
  return { api_keys: json.api_keys ?? [] };
}

/**
 * Resolves the store publishable key: `GET /admin/api-keys?type=publishable` (admin JWT required).
 */
export async function resolvePublishableApiKey(
  baseUrl: string,
  adminJwt: string,
): Promise<string> {
  const { api_keys } = await fetchAdminApiKeys(baseUrl, adminJwt, {
    type: "publishable",
    limit: "50",
  });

  const key = api_keys.find(
    (k) => !k.revoked_at && typeof k.token === "string" && k.token.length > 0,
  );

  if (!key?.token) {
    throw new Error(
      "No active publishable key returned from GET /admin/api-keys?type=publishable. Run seed (test:db:prepare).",
    );
  }

  return key.token;
}

export type StoreCartE2EContext = {
  baseUrl: string;
  adminJwt: string;
  publishableApiKey: string;
  regionId: string;
  salesChannelId: string;
  variantId: string;
  disposableProductId: string;
};

function adminCredentials(): { email: string; password: string } {
  const email = process.env.USER_ACCOUNT?.trim();
  const password = process.env.PASSWORD?.trim();
  if (!email || !password) {
    throw new Error(
      "Set USER_ACCOUNT and PASSWORD (e.g. in .env.test; use bun --env-file=.env.test)",
    );
  }
  return { email, password };
}

async function fetchFirstRegion(
  baseUrl: string,
  adminJwt: string,
): Promise<{ id: string; currency_code: string }> {
  const res = await adminFetch(baseUrl, "/admin/regions?limit=20", adminJwt, {
    method: "GET",
  });
  const json = (await res.json()) as {
    regions?: Array<{ id?: string; currency_code?: string }>;
  };
  if (!res.ok) {
    throw new Error(
      `GET /admin/regions failed (${res.status}): ${JSON.stringify(json)}`,
    );
  }
  const r = json.regions?.find((x) => x.id);
  const currency =
    r?.currency_code ??
    (r as { currencies?: Array<{ currency_code?: string }> } | undefined)
      ?.currencies?.[0]?.currency_code;
  if (!r?.id || !currency) {
    throw new Error(
      "No region with a currency from GET /admin/regions. Run seed (test:db:prepare).",
    );
  }
  return { id: r.id, currency_code: currency };
}

async function fetchDefaultSalesChannelId(
  baseUrl: string,
  adminJwt: string,
): Promise<string> {
  const res = await adminFetch(
    baseUrl,
    "/admin/sales-channels?limit=20",
    adminJwt,
    { method: "GET" },
  );
  const json = (await res.json()) as {
    sales_channels?: Array<{ id?: string; name?: string }>;
  };
  if (!res.ok) {
    throw new Error(
      `GET /admin/sales-channels failed (${res.status}): ${JSON.stringify(json)}`,
    );
  }
  const list = json.sales_channels ?? [];
  const preferred = list.find((c) => c.name === "Default Sales Channel");
  const pick = preferred ?? list[0];
  if (!pick?.id) {
    throw new Error(
      "No sales channel from GET /admin/sales-channels. Run seed (test:db:prepare).",
    );
  }
  return pick.id;
}

async function fetchFirstShippingProfileId(
  baseUrl: string,
  adminJwt: string,
): Promise<string> {
  const res = await adminFetch(
    baseUrl,
    "/admin/shipping-profiles?limit=10",
    adminJwt,
    { method: "GET" },
  );
  const json = (await res.json()) as {
    shipping_profiles?: Array<{ id?: string }>;
  };
  if (!res.ok) {
    throw new Error(
      `GET /admin/shipping-profiles failed (${res.status}): ${JSON.stringify(json)}`,
    );
  }
  const id = json.shipping_profiles?.find((p) => p.id)?.id;
  if (!id) {
    throw new Error(
      "No shipping profile from GET /admin/shipping-profiles. Run seed (test:db:prepare).",
    );
  }
  return id;
}

/**
 * Creates a minimal published product with one variant for cart line-item tests; returns product + variant ids.
 */
async function createDisposableE2eProduct(
  baseUrl: string,
  adminJwt: string,
  input: {
    salesChannelId: string;
    shippingProfileId: string;
    currencyCode: string;
  },
): Promise<{ productId: string; variantId: string }> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const body = {
    title: `E2E harness product ${suffix}`,
    handle: `e2e-harness-${suffix}`,
    status: "published" as const,
    shipping_profile_id: input.shippingProfileId,
    discountable: true,
    options: [{ title: "Type", values: ["Standard"] }],
    variants: [
      {
        title: "Standard",
        sku: `e2e-harness-${suffix}`,
        options: { Type: "Standard" },
        prices: [
          {
            currency_code: input.currencyCode,
            amount: 1000,
          },
        ],
        manage_inventory: false,
      },
    ],
    sales_channels: [{ id: input.salesChannelId }],
  };

  const res = await adminFetch(baseUrl, "/admin/products", adminJwt, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    product?: {
      id?: string;
      variants?: Array<{ id?: string }>;
    };
    message?: string;
  };
  if (!res.ok) {
    throw new Error(
      `POST /admin/products failed (${res.status}): ${JSON.stringify(json)}`,
    );
  }
  const productId = json.product?.id;
  const variantId = json.product?.variants?.[0]?.id;
  if (!productId || !variantId) {
    throw new Error(
      `POST /admin/products missing product/variant id: ${JSON.stringify(json)}`,
    );
  }
  return { productId, variantId };
}

export async function deleteAdminProduct(
  baseUrl: string,
  adminJwt: string,
  productId: string,
): Promise<void> {
  const res = await adminFetch(
    baseUrl,
    `/admin/products/${productId}`,
    adminJwt,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const text = await res.text();
    console.warn(
      `DELETE /admin/products/${productId} failed (${res.status}): ${text}`,
    );
  }
}

/**
 * Health wait, admin JWT, publishable key, region, sales channel, and a fresh product variant (POST /admin/products).
 */
export async function bootstrapStoreCartE2E(
  baseUrl: string,
): Promise<StoreCartE2EContext> {
  await waitForHealth(baseUrl);
  const { email, password } = adminCredentials();
  const adminJwt = await loginAdminJwt(baseUrl, email, password);
  const publishableApiKey = await resolvePublishableApiKey(baseUrl, adminJwt);
  const region = await fetchFirstRegion(baseUrl, adminJwt);
  const salesChannelId = await fetchDefaultSalesChannelId(baseUrl, adminJwt);
  const shippingProfileId = await fetchFirstShippingProfileId(
    baseUrl,
    adminJwt,
  );
  const { productId, variantId } = await createDisposableE2eProduct(
    baseUrl,
    adminJwt,
    {
      salesChannelId,
      shippingProfileId,
      currencyCode: region.currency_code,
    },
  );

  return {
    baseUrl,
    adminJwt,
    publishableApiKey,
    regionId: region.id,
    salesChannelId,
    variantId,
    disposableProductId: productId,
  };
}

/** Medusa public URL from `.env.test` (same as `test:dev` / storefront). */
export function medusaBackendBaseUrl(): string {
  const v = process.env.MEDUSA_BACKEND_URL?.trim();
  if (!v) {
    throw new Error(
      "MEDUSA_BACKEND_URL is not set (add to .env.test; use bun --env-file=.env.test)",
    );
  }
  return v.replace(/\/$/, "");
}

export async function waitForHealth(
  baseUrl: string,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const intervalMs = options.intervalMs ?? 500;
  const deadline = Date.now() + timeoutMs;
  const url = `${originOf(baseUrl)}/health`;

  while (Date.now() < deadline) {
    try {
      const res = await e2eFetch(url, { method: "GET" });
      if (res.ok) {
        return;
      }
    } catch {
      /* server not ready */
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Health check failed within ${timeoutMs}ms: ${url}`);
}

function extractConnectSid(setCookieValues: string[]): string | null {
  for (const raw of setCookieValues) {
    const part = raw.split(",")[0]?.trim();
    if (!part?.toLowerCase().startsWith("connect.sid=")) {
      continue;
    }
    const semi = part.indexOf(";");
    const pair = semi === -1 ? part : part.slice(0, semi);
    return pair;
  }
  return null;
}

function getSetCookieHeaders(res: Response): string[] {
  const anyHeaders = res.headers as Headers & {
    getSetCookie?: () => string[];
  };
  if (typeof anyHeaders.getSetCookie === "function") {
    return anyHeaders.getSetCookie();
  }
  const single = res.headers.get("set-cookie");
  return single ? [single] : [];
}

export type StoreSession = {
  cookieHeader: string;
};

/**
 * Medusa session flow: JWT from emailpass, then POST /auth/session → connect.sid
 */
export async function establishCustomerSession(
  baseUrl: string,
  options: {
    email: string;
    password: string;
    publishableApiKey: string;
  },
): Promise<StoreSession> {
  const origin = originOf(baseUrl);
  const pub = { [PUBLISHABLE_HEADER]: options.publishableApiKey };

  const loginRes = await e2eFetch(`${origin}/auth/customer/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...pub },
    body: JSON.stringify({
      email: options.email,
      password: options.password,
    }),
  });

  const loginJson = (await loginRes.json()) as {
    token?: string;
    message?: string;
  };
  if (!loginRes.ok || !loginJson.token) {
    throw new Error(
      `Login failed: ${loginRes.status} ${JSON.stringify(loginJson)}`,
    );
  }

  const sessionRes = await e2eFetch(`${origin}/auth/session`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${loginJson.token}`,
      ...pub,
    },
  });

  if (!sessionRes.ok) {
    const text = await sessionRes.text();
    throw new Error(`Session creation failed: ${sessionRes.status} ${text}`);
  }

  const cookies = getSetCookieHeaders(sessionRes);
  const sid = extractConnectSid(cookies);
  if (!sid) {
    throw new Error(
      `No connect.sid in Set-Cookie. Got: ${JSON.stringify(cookies)}`,
    );
  }

  return { cookieHeader: sid };
}

export async function storeFetch(
  baseUrl: string,
  path: string,
  init: RequestInit & { publishableApiKey: string; session?: StoreSession },
): Promise<Response> {
  const origin = originOf(baseUrl);
  const url = path.startsWith("http")
    ? path
    : `${origin}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init.headers);
  headers.set(PUBLISHABLE_HEADER, init.publishableApiKey);
  if (init.session?.cookieHeader) {
    const existing = headers.get("cookie");
    headers.set(
      "cookie",
      existing
        ? `${init.session.cookieHeader}; ${existing}`
        : init.session.cookieHeader,
    );
  }

  return e2eFetch(url, { ...init, headers });
}
