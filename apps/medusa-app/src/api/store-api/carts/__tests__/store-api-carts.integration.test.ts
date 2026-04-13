import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  bootstrapStoreCartIntegration,
  deleteAdminProduct,
  establishCustomerSession,
  medusaBackendBaseUrl,
  type StoreCartIntegrationContext,
  storeFetch,
} from "../../../../../test/integration/http-session";
import { deleteCartsByIdsViaMedusaExec } from "../../../../../test/integration/medusa-exec";

type HttpErrJson = { code?: string; message?: string };

type CartJson = {
  cart: {
    id: string;
    email?: string | null;
    items?: Array<{
      id: string;
      quantity: number;
      variant_id?: string | null | { id?: string };
    }>;
    metadata?: {
      unselected?: Record<string, { quantity: number }>;
    } | null;
    display_lines?: Array<{ kind: string }>;
  };
};

function lineVariantId(
  item: NonNullable<CartJson["cart"]["items"]>[number],
): string | undefined {
  const v = item.variant_id;
  if (typeof v === "string") {
    return v;
  }
  if (v && typeof v === "object" && "id" in v && typeof v.id === "string") {
    return v.id;
  }
  return undefined;
}

function isCartNumericAmount(value: unknown): boolean {
  if (value == null) {
    return false;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return true;
  }
  if (typeof value === "string" && value !== "") {
    return Number.isFinite(Number(value));
  }
  if (typeof value === "object") {
    const o = value as { numeric?: unknown; value?: unknown };
    if (o.numeric != null && Number.isFinite(Number(o.numeric))) {
      return true;
    }
    if (o.value != null && o.value !== "") {
      return Number.isFinite(Number(o.value));
    }
  }
  return false;
}

// --- Added for line-item pricing contract (store-api default fields) ---
// Asserts every *selected* line (cart.items[]) includes Medusa `subtotal` and `total`.
// Unselected snapshots (metadata.unselected) are intentionally not checked here.
//
// Changelog: (1) Added isCartNumericAmount + this helper + wired into GET/POST cart flows
// that return items; replaced optional multi-key line totals in "adds a line item".
// (2) Mutation cart routes now end with refetchCart + default query fields so JSON matches
// GET /store-api/carts/:id (see unselect DELETE middleware for queryConfig).
function expectSelectedItemsHaveSubtotalAndTotal(cart: {
  items?: unknown[];
}): void {
  const items = cart.items;
  if (!items?.length) {
    return;
  }
  for (const raw of items) {
    const row = raw as Record<string, unknown>;
    expect(isCartNumericAmount(row.subtotal)).toBe(true);
    expect(isCartNumericAmount(row.total)).toBe(true);
  }
}

describe("store-api carts (HTTP integration)", () => {
  let ctx: StoreCartIntegrationContext;
  /** Carts created during tests — removed in afterAll so the DB stays clean. */
  const createdCartIds = new Set<string>();

  function rememberCart(id: string | undefined): void {
    if (id?.startsWith("cart_")) {
      createdCartIds.add(id);
    }
  }

  function createCartPayload(): Record<string, string> {
    return {
      region_id: ctx.regionId,
      sales_channel_id: ctx.salesChannelId,
    };
  }

  async function postGuestCart(): Promise<string> {
    const res = await storeFetch(ctx.baseUrl, "/store-api/carts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createCartPayload()),
      publishableApiKey: ctx.publishableApiKey,
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as CartJson;
    const id = json.cart?.id;
    expect(id).toMatch(/^cart_/);
    rememberCart(id);
    return id!;
  }

  async function getCart(cartId: string): Promise<CartJson> {
    const res = await storeFetch(ctx.baseUrl, `/store-api/carts/${cartId}`, {
      method: "GET",
      publishableApiKey: ctx.publishableApiKey,
    });
    expect(res.status).toBe(200);
    return (await res.json()) as CartJson;
  }

  async function addLine(cartId: string, quantity: number): Promise<CartJson> {
    const res = await storeFetch(
      ctx.baseUrl,
      `/store-api/carts/${cartId}/line-items`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant_id: ctx.variantId, quantity }),
        publishableApiKey: ctx.publishableApiKey,
      },
    );
    expect(res.status).toBe(200);
    return (await res.json()) as CartJson;
  }

  async function updateLineQuantity(
    cartId: string,
    lineItemId: string,
    quantity: number,
  ): Promise<Response> {
    return storeFetch(
      ctx.baseUrl,
      `/store-api/carts/${cartId}/line-items/${lineItemId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
        publishableApiKey: ctx.publishableApiKey,
      },
    );
  }

  async function unselectLine(
    cartId: string,
    lineItemId: string,
  ): Promise<Response> {
    return storeFetch(
      ctx.baseUrl,
      `/store-api/carts/${cartId}/line-items/${lineItemId}/unselect`,
      {
        method: "DELETE",
        publishableApiKey: ctx.publishableApiKey,
      },
    );
  }

  async function setVariantQuantity(
    cartId: string,
    variantId: string,
    quantity: number,
  ): Promise<Response> {
    return storeFetch(
      ctx.baseUrl,
      `/store-api/carts/${cartId}/variants/${variantId}/quantity`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
        publishableApiKey: ctx.publishableApiKey,
      },
    );
  }

  async function deleteLineItem(
    cartId: string,
    itemId: string,
  ): Promise<Response> {
    return storeFetch(
      ctx.baseUrl,
      `/store-api/carts/${cartId}/delete-line-item`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
        publishableApiKey: ctx.publishableApiKey,
      },
    );
  }

  beforeAll(
    async () => {
      ctx = await bootstrapStoreCartIntegration(medusaBackendBaseUrl());
    },
    { timeout: 120_000 },
  );

  afterAll(
    async () => {
      if (createdCartIds.size > 0) {
        try {
          deleteCartsByIdsViaMedusaExec([...createdCartIds]);
        } catch (e) {
          console.warn(
            "[integration-test] Cart cleanup (medusa exec) failed — you may need to delete carts manually:",
            e,
          );
        }
      }
      if (ctx?.disposableProductId && ctx.adminJwt) {
        await deleteAdminProduct(
          ctx.baseUrl,
          ctx.adminJwt,
          ctx.disposableProductId,
        );
      }
    },
    { timeout: 120_000 },
  );

  describe("POST /store-api/carts", () => {
    it("creates a guest cart with initialized unselected metadata", async () => {
      const cartId = await postGuestCart();
      const { cart } = await getCart(cartId);
      expect(cart.metadata?.unselected).toBeDefined();
      expect(typeof cart.metadata?.unselected).toBe("object");
    });
  });

  describe("GET /store-api/carts", () => {
    it("returns 401 without customer session", async () => {
      const res = await storeFetch(
        ctx.baseUrl,
        `/store-api/carts?region_id=${encodeURIComponent(ctx.regionId)}&sales_channel_id=${encodeURIComponent(ctx.salesChannelId)}`,
        {
          method: "GET",
          publishableApiKey: ctx.publishableApiKey,
        },
      );
      expect(res.status).toBe(401);
    });

    it("returns cart for authenticated customer", async () => {
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
      const json = (await res.json()) as CartJson;
      expect(json.cart?.id).toMatch(/^cart_/);
      rememberCart(json.cart?.id);
      expectSelectedItemsHaveSubtotalAndTotal(json.cart);
    });
  });

  describe("GET /store-api/carts/:id", () => {
    it("returns the cart and display_lines when lines exist", async () => {
      const cartId = await postGuestCart();
      await addLine(cartId, 1);
      const { cart } = await getCart(cartId);
      expect(cart.id).toBe(cartId);
      expect(cart.items?.length).toBeGreaterThan(0);
      expectSelectedItemsHaveSubtotalAndTotal(cart);
      expect(Array.isArray(cart.display_lines)).toBe(true);
      expect(cart.display_lines!.length).toBeGreaterThan(0);
    });
  });

  describe("POST /store-api/carts/:id", () => {
    it("updates allowed fields without accepting cart metadata from client", async () => {
      const cartId = await postGuestCart();
      await addLine(cartId, 1);
      const testEmail = `integration-cart-${Date.now()}@example.com`;
      const res = await storeFetch(ctx.baseUrl, `/store-api/carts/${cartId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
        publishableApiKey: ctx.publishableApiKey,
      });
      expect(res.status).toBe(200);
      const { cart } = (await res.json()) as CartJson;
      expect(cart.email).toBe(testEmail);
      expectSelectedItemsHaveSubtotalAndTotal(cart);
    });
  });

  describe("POST /store-api/carts/:id/line-items", () => {
    it("adds a line item", async () => {
      const cartId = await postGuestCart();
      const { cart } = await addLine(cartId, 1);
      expect(cart.items?.length).toBeGreaterThan(0);
      expect(lineVariantId(cart.items![0]!)).toBe(ctx.variantId);

      const row = cart.items![0]! as Record<string, unknown>;
      expect(typeof row.unit_price).toBe("number");
      expectSelectedItemsHaveSubtotalAndTotal(cart);
    });

    it("returns 400 when variant exists only in unselected (must use variant quantity endpoint)", async () => {
      const cartId = await postGuestCart();
      const afterAdd = await addLine(cartId, 1);
      const lineId = afterAdd.cart.items![0]!.id;
      const unselRes = await unselectLine(cartId, lineId);
      expect(unselRes.status).toBe(200);

      const conflict = await storeFetch(
        ctx.baseUrl,
        `/store-api/carts/${cartId}/line-items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variant_id: ctx.variantId, quantity: 1 }),
          publishableApiKey: ctx.publishableApiKey,
        },
      );
      expect(conflict.status).toBe(400);
      const json = (await conflict.json()) as HttpErrJson;
      expect(json.code).toBe("CART.USE_VARIANT_QUANTITY_ENDPOINT");
    });
  });

  describe("POST /store-api/carts/:id/line-items/:line_id", () => {
    it("updates quantity on a selected line", async () => {
      const cartId = await postGuestCart();
      await addLine(cartId, 1);
      const { cart: before } = await getCart(cartId);
      const lineId = before.items![0]!.id;

      const res = await updateLineQuantity(cartId, lineId, 3);
      expect(res.status).toBe(200);
      const { cart } = (await res.json()) as CartJson;
      expectSelectedItemsHaveSubtotalAndTotal(cart);
      const item = cart.items?.find((i) => i.id === lineId);
      expect(item?.quantity).toBe(3);
    });

    it("removes the line when quantity is 0", async () => {
      const cartId = await postGuestCart();
      await addLine(cartId, 2);
      const { cart: before } = await getCart(cartId);
      const lineId = before.items![0]!.id;

      const res = await updateLineQuantity(cartId, lineId, 0);
      expect(res.status).toBe(200);
      const { cart } = (await res.json()) as CartJson;
      expect(cart.items?.some((i) => i.id === lineId)).toBe(false);
    });

    it("returns 404 for unknown line item id", async () => {
      const cartId = await postGuestCart();
      const res = await updateLineQuantity(cartId, "item_nonexistent_01", 1);
      expect(res.status).toBe(404);
      const json = (await res.json()) as HttpErrJson;
      expect(json.code).toBe("CART.ITEM_NOT_FOUND");
    });
  });

  describe("DELETE /store-api/carts/:id/line-items/:line_id/unselect", () => {
    it("moves a selected line into metadata.unselected", async () => {
      const cartId = await postGuestCart();
      await addLine(cartId, 2);
      const { cart: before } = await getCart(cartId);
      const lineId = before.items![0]!.id;

      const res = await unselectLine(cartId, lineId);
      expect(res.status).toBe(200);
      const { cart } = (await res.json()) as CartJson;
      expect(cart.items?.some((i) => i.id === lineId)).toBe(false);
      expect(cart.metadata?.unselected?.[ctx.variantId]?.quantity).toBe(2);
    });
  });

  describe("POST /store-api/carts/:id/variants/:variant_id/quantity", () => {
    it("sets absolute quantity for an unselected variant (brings units back as a line item)", async () => {
      const cartId = await postGuestCart();
      await addLine(cartId, 3);
      const lineId = (await getCart(cartId)).cart.items![0]!.id;
      expect((await unselectLine(cartId, lineId)).status).toBe(200);

      const res = await setVariantQuantity(cartId, ctx.variantId, 1);
      expect(res.status).toBe(200);
      const { cart } = (await res.json()) as CartJson;
      expect(cart.metadata?.unselected?.[ctx.variantId]).toBeUndefined();
      const line = cart.items?.find((i) => lineVariantId(i) === ctx.variantId);
      expect(line?.quantity).toBe(1);
      expectSelectedItemsHaveSubtotalAndTotal(cart);
    });

    it("removes the variant entirely when quantity is 0 (unselected only)", async () => {
      const cartId = await postGuestCart();
      await addLine(cartId, 2);
      const lineId = (await getCart(cartId)).cart.items![0]!.id;
      expect((await unselectLine(cartId, lineId)).status).toBe(200);
      expect(
        (await getCart(cartId)).cart.metadata?.unselected?.[ctx.variantId]
          ?.quantity,
      ).toBe(2);

      const res = await setVariantQuantity(cartId, ctx.variantId, 0);
      expect(res.status).toBe(200);
      const { cart } = (await res.json()) as CartJson;
      expect(cart.metadata?.unselected?.[ctx.variantId]).toBeUndefined();
      expect(cart.items?.some((i) => lineVariantId(i) === ctx.variantId)).toBe(
        false,
      );
    });

    it("removes selected line items when quantity is 0", async () => {
      const cartId = await postGuestCart();
      await addLine(cartId, 1);
      const { cart: before } = await getCart(cartId);
      expect(before.items?.length).toBeGreaterThan(0);

      const res = await setVariantQuantity(cartId, ctx.variantId, 0);
      expect(res.status).toBe(200);
      const { cart } = (await res.json()) as CartJson;
      expect(cart.items?.some((i) => lineVariantId(i) === ctx.variantId)).toBe(
        false,
      );
    });
  });

  describe("POST /store-api/carts/:id/delete-line-item", () => {
    it("removes a line item by item_id", async () => {
      const cartId = await postGuestCart();
      await addLine(cartId, 1);
      const lineId = (await getCart(cartId)).cart.items![0]!.id;

      const res = await deleteLineItem(cartId, lineId);
      expect(res.status).toBe(200);
      const { cart } = (await res.json()) as CartJson;
      expect(cart.items?.some((i) => i.id === lineId)).toBe(false);
    });

    it("returns 400 when item_id is missing", async () => {
      const cartId = await postGuestCart();
      const res = await storeFetch(
        ctx.baseUrl,
        `/store-api/carts/${cartId}/delete-line-item`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
          publishableApiKey: ctx.publishableApiKey,
        },
      );
      expect(res.status).toBe(400);
    });
  });

  describe("Legacy Medusa store cart routes (disabled)", () => {
    it("POST /store/carts returns 403 with pointer to store-api", async () => {
      const res = await storeFetch(ctx.baseUrl, "/store/carts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createCartPayload()),
        publishableApiKey: ctx.publishableApiKey,
      });
      expect(res.status).toBe(403);
      const json = (await res.json()) as HttpErrJson;
      expect(json.code).toBe("AUTH.FORBIDDEN");
      expect(json.message).toContain("/store-api/carts");
    });

    it("POST /store/carts/:id/line-items returns 403 with pointer to store-api", async () => {
      const cartId = await postGuestCart();
      const res = await storeFetch(
        ctx.baseUrl,
        `/store/carts/${cartId}/line-items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variant_id: ctx.variantId, quantity: 1 }),
          publishableApiKey: ctx.publishableApiKey,
        },
      );
      expect(res.status).toBe(403);
      const json = (await res.json()) as HttpErrJson;
      expect(json.message).toContain("/store-api/carts");
    });
  });
});
