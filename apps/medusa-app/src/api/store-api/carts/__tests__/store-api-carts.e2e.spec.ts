import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  bootstrapStoreCartE2E,
  deleteAdminProduct,
  establishCustomerSession,
  medusaBackendBaseUrl,
  type StoreCartE2EContext,
  storeFetch,
} from "../../../../../test/e2e/http-session";

describe("store-api carts (HTTP E2E)", () => {
  let ctx: StoreCartE2EContext;

  beforeAll(
    async () => {
      ctx = await bootstrapStoreCartE2E(medusaBackendBaseUrl());
    },
    { timeout: 120_000 },
  );

  afterAll(async () => {
    if (ctx?.disposableProductId && ctx.adminJwt) {
      await deleteAdminProduct(
        ctx.baseUrl,
        ctx.adminJwt,
        ctx.disposableProductId,
      );
    }
  });

  it("POST /store-api/carts creates a guest cart", async () => {
    const body: Record<string, string> = {
      region_id: ctx.regionId,
      sales_channel_id: ctx.salesChannelId,
    };

    const res = await storeFetch(ctx.baseUrl, "/store-api/carts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      publishableApiKey: ctx.publishableApiKey,
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { cart?: { id?: string } };
    expect(json.cart?.id).toMatch(/^cart_/);
  });

  it("GET /store-api/carts returns cart for authenticated customer", async () => {
    const email = process.env.CUSTOMER_ACCOUNT?.trim();
    const password = process.env.PASSWORD?.trim();

    if (!email || !password) {
      console.warn(
        "Skip authenticated cart test: set CUSTOMER_ACCOUNT and PASSWORD in .env.test",
      );
      return;
    }

    const session = await establishCustomerSession(ctx.baseUrl, {
      email,
      password,
      publishableApiKey: ctx.publishableApiKey,
    });

    const params = new URLSearchParams({
      region_id: ctx.regionId,
      sales_channel_id: ctx.salesChannelId,
    });

    const res = await storeFetch(ctx.baseUrl, `/store-api/carts?${params}`, {
      method: "GET",
      publishableApiKey: ctx.publishableApiKey,
      session,
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { cart?: { id?: string } };
    expect(json.cart?.id).toMatch(/^cart_/);
  });

  it("POST /store-api/carts/:id/line-items adds a line", async () => {
    const body: Record<string, string> = {
      region_id: ctx.regionId,
      sales_channel_id: ctx.salesChannelId,
    };

    const createRes = await storeFetch(ctx.baseUrl, "/store-api/carts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      publishableApiKey: ctx.publishableApiKey,
    });
    expect(createRes.status).toBe(200);
    const { cart } = (await createRes.json()) as { cart: { id: string } };

    const addRes = await storeFetch(
      ctx.baseUrl,
      `/store-api/carts/${cart.id}/line-items`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant_id: ctx.variantId, quantity: 1 }),
        publishableApiKey: ctx.publishableApiKey,
      },
    );

    expect(addRes.status).toBe(200);
    const updated = (await addRes.json()) as {
      cart?: { items?: unknown[] };
    };
    expect(updated.cart?.items?.length).toBeGreaterThan(0);
  });
});
