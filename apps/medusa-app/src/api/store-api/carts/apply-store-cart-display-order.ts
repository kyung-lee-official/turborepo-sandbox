import type {
  CartDisplayLine,
  CartMetadata,
  CartUnselectedEntry,
} from "@repo/types";

type SortableRow =
  | {
      kind: "line_item";
      variantId: string;
      sortMs: number;
      tieId: string;
      item: Record<string, unknown>;
    }
  | {
      kind: "unselected";
      variantId: string;
      sortMs: number;
      tieId: string;
      snapshot: CartUnselectedEntry;
    };

function parseSortMs(iso: string | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

function compareRows(a: SortableRow, b: SortableRow): number {
  if (a.sortMs !== b.sortMs) {
    return a.sortMs - b.sortMs;
  }
  const v = a.variantId.localeCompare(b.variantId);
  if (v !== 0) return v;
  return a.tieId.localeCompare(b.tieId);
}

/**
 * Mutates cart JSON in place: sorts `items`, reorders `metadata.unselected` key order,
 * and sets `display_lines` for interleaved storefront rendering
 * (`{ kind, item }` for both line items and unselected snapshots).
 */
export function applyStoreCartDisplayOrder(cart: Record<string, unknown>): void {
  const metadata = (cart.metadata ?? {}) as unknown as CartMetadata;
  const originalMap = metadata.item_original_created_at ?? {};
  const unselected = { ...(metadata.unselected ?? {}) };

  const items = Array.isArray(cart.items)
    ? (cart.items as Record<string, unknown>[])
    : [];

  const rows: SortableRow[] = [];

  for (const item of items) {
    const variantId =
      typeof item.variant_id === "string"
        ? item.variant_id
        : typeof item.variant_id === "object" &&
            item.variant_id !== null &&
            "id" in item.variant_id
          ? String((item.variant_id as { id: string }).id)
          : "";
    const lineCreated =
      typeof item.created_at === "string" || typeof item.created_at === "number"
        ? String(item.created_at)
        : undefined;
    const fallbackIso = lineCreated ?? new Date(0).toISOString();
    const sortIso = variantId
      ? (originalMap[variantId] ?? fallbackIso)
      : fallbackIso;
    const tieId =
      typeof item.id === "string" ? item.id : JSON.stringify(item.id ?? "");

    rows.push({
      kind: "line_item",
      variantId,
      sortMs: parseSortMs(sortIso),
      tieId,
      item,
    });
  }

  for (const [variantId, snapshot] of Object.entries(unselected)) {
    if (!snapshot) continue;
    const sortIso =
      originalMap[variantId] ?? snapshot.created_at ?? new Date(0).toISOString();
    rows.push({
      kind: "unselected",
      variantId,
      sortMs: parseSortMs(sortIso),
      tieId: variantId,
      snapshot,
    });
  }

  rows.sort(compareRows);

  cart.items = rows
    .filter((r): r is Extract<SortableRow, { kind: "line_item" }> => r.kind === "line_item")
    .map((r) => r.item);

  const sortedUnselectedEntries = rows.filter(
    (r): r is Extract<SortableRow, { kind: "unselected" }> =>
      r.kind === "unselected",
  );
  metadata.unselected = Object.fromEntries(
    sortedUnselectedEntries.map((r) => [r.variantId, r.snapshot]),
  ) as CartMetadata["unselected"];

  cart.metadata = metadata as unknown as Record<string, unknown>;

  cart.display_lines = rows.map((r) => {
    if (r.kind === "line_item") {
      return { kind: "line_item" as const, item: r.item };
    }
    const { variantId, snapshot } = r;
    return {
      kind: "unselected" as const,
      item: {
        variant_id: variantId,
        ...snapshot,
      },
    };
  }) as CartDisplayLine[];
}
