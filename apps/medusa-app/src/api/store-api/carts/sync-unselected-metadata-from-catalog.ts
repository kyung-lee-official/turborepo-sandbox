import type { Query } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import type { ICartModuleService, MedusaContainer } from "@medusajs/types";
import type { CartMetadata, CartUnselectedEntry } from "@repo/types";

type VariantCatalogRow = {
  id: string;
  title: string | null;
  sku: string | null;
  product?: {
    title?: string | null;
    subtitle?: string | null;
    thumbnail?: string | null;
  } | null;
  prices?: { amount?: unknown; currency_code?: string | null }[] | null;
};

function priceAmountToNumber(amount: unknown): number | null {
  if (amount == null) return null;
  if (typeof amount === "number" && Number.isFinite(amount)) return amount;
  if (typeof amount === "string") {
    const n = parseFloat(amount);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof amount === "object" && amount !== null && "numeric" in amount) {
    const n = Number((amount as { numeric?: number }).numeric);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(amount);
  return Number.isFinite(n) ? n : null;
}

/**
 * Re-reads catalog fields for `metadata.unselected` variants (title, prices, SKU, thumbnail)
 * so admin edits to products/variants are reflected on the cart. Preserves `quantity` and
 * `created_at` on each snapshot (and other cart-level metadata keys).
 */
export async function syncUnselectedMetadataFromCatalog(
  cartId: string,
  scope: MedusaContainer,
): Promise<void> {
  const cartModule = scope.resolve(Modules.CART) as ICartModuleService;
  const query = scope.resolve(ContainerRegistrationKeys.QUERY) as Query;

  const cart = await cartModule.retrieveCart(cartId);
  const rawMeta = cart.metadata as Record<string, unknown> | null | undefined;
  if (!rawMeta) {
    return;
  }

  const metadata = rawMeta as unknown as CartMetadata;
  const unselected = metadata.unselected;
  if (!unselected || Object.keys(unselected).length === 0) {
    return;
  }

  const currencyCode = cart.currency_code;
  if (!currencyCode) {
    return;
  }

  const variantIds = Object.keys(unselected);
  const updatedUnselected: Record<string, CartUnselectedEntry> = {
    ...unselected,
  };

  for (const variantId of variantIds) {
    const entry = unselected[variantId];
    if (!entry) continue;

    const fields = [
      "id",
      "title",
      "sku",
      "product.title",
      "product.subtitle",
      "product.thumbnail",
      "prices.amount",
      "prices.currency_code",
    ] as const;

    let rows =
      (
        await query.graph({
          entity: "product_variant",
          fields: [...fields],
          filters: { id: variantId },
        })
      ).data ?? [];

    if (rows.length === 0) {
      rows =
        (
          await query.graph({
            entity: "variant",
            fields: [...fields],
            filters: { id: variantId },
          })
        ).data ?? [];
    }

    const row = rows[0] as VariantCatalogRow | undefined;
    if (!row) {
      continue;
    }

    const prices = row.prices ?? [];
    const priceForCurrency = prices.find(
      (p) => p.currency_code === currencyCode,
    );
    const nextUnitPrice = priceForCurrency
      ? priceAmountToNumber(priceForCurrency.amount)
      : null;

    updatedUnselected[variantId] = {
      ...entry,
      title: row.product?.title ?? entry.title,
      subtitle:
        row.product?.subtitle !== undefined
          ? row.product.subtitle
          : entry.subtitle,
      variant_title: row.title ?? entry.variant_title,
      variant_sku: row.sku ?? entry.variant_sku,
      thumbnail:
        row.product?.thumbnail !== undefined
          ? row.product.thumbnail
          : entry.thumbnail,
      unit_price:
        nextUnitPrice !== null && nextUnitPrice !== undefined
          ? nextUnitPrice
          : entry.unit_price,
    };
  }

  const hasChanges = variantIds.some((vid) => {
    const before = unselected[vid];
    const after = updatedUnselected[vid];
    if (!before || !after) return false;
    return (
      before.title !== after.title ||
      before.subtitle !== after.subtitle ||
      before.variant_title !== after.variant_title ||
      before.variant_sku !== after.variant_sku ||
      before.unit_price !== after.unit_price ||
      before.thumbnail !== after.thumbnail
    );
  });

  if (!hasChanges) {
    return;
  }

  await cartModule.updateCarts(cartId, {
    metadata: {
      ...rawMeta,
      unselected: updatedUnselected,
    },
  });
}
