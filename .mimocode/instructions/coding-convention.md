# Coding convention

## Prepositions: `from` vs `by` (identifiers)

Use **`From`** and **`By`** in **function names**, **parameters**, **locals**, and **Map** identifiers so names reflect whether a value is **read off** a source or **found using** keys.

| Use | Meaning | Name with |
| --- | ------- | --------- |
| **`From`** | Value is **read off** a source already in scope | `getEmailFromUser`, `amountFromRow`, `dateFromCell` |
| **`By`** | Value is **found using** key(s), query, or algorithm | `findUserByEmail`, `getPriceBySku`, `matchRuleByPrefix` |

**Heuristic:** lookup / resolve / match / `findFirst` / `Map.get` → **`By`**. Field access, destructuring, ingest column → **`From`**.

```typescript
// ✅ GOOD — resolve BY keys; read field FROM record
function findUserByEmail(email: string) { ... }
function matchRuleByPrefix(id: string, rules: readonly Rule[]) { ... }
function amountFromRow(row: Row) { return row.amount; }
const email = user.email;

// ❌ BAD — sounds like lookup but name says "from"
function categoryFromSku(sku: string) {
  return categoryMap.get(sku);
}
```

### Functions and methods

- **`resolve*By*` / `match*By*` / `find*By*` / `load*By*`** — computation or fetch keyed by arguments.
- **`*From*`** — pure transform: map enum/label → value, copy a column into a DTO, parse a cell.

### Maps and indexes

- **`fooByBar`** or **`fooByBarKey`** for `Map<Bar, Foo>`.
- Do not name a map `fooFromBar` unless values are literally copied from `bar` with no lookup semantics.

---

## Avoid thin wrappers

Do **not** add a function that only forwards the same arguments to another function with no extra logic.

| Do | Don't |
| --- | --- |
| One canonical implementation; callers pass through at the call site | `export function fooWrapper(x) { return fooCore(x); }` |
| Adapter at a **real** boundary (DTO shape → flat args) | Duplicate export names that differ only by a prefix |

**When a wrapper is OK:** renames/shapes data for a different API, hides a dependency, breaks an import cycle, adds validation/logging/caching.

**Heuristic:** If deleting the function leaves a single `return otherFn(sameArgs)` with no rename or mapping, inline the call instead.

```typescript
// ✅ GOOD — map fields inline at call site
const result = resolveLayers({ platform, orderId });
rows.push({
  category: result.category,
  layer1: result.l1,
  layer2: result.l2,
});

// ❌ BAD — wrapper that only renames fields
function columnsFromLayers(layers: Layers) {
  return { category: layers.cat, layer1: layers.l1, layer2: layers.l2 };
}
```

---

## Enum branching

When control flow branches on an **enum**, **const enum**, **`z.enum`**, or a **string union** with a fixed set of variants, use **`switch`** — not a chain of separate **`if`** statements.

```typescript
// ✅ GOOD
function isActive(status: Status): boolean {
  switch (status) {
    case Status.Active:
      return true;
    case Status.Inactive:
      return false;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

// ❌ BAD — multiple ifs on the same discriminant
function isActive(status: Status): boolean {
  if (status === Status.Active) return true;
  if (status === Status.Inactive) return false;
  throw new Error(`Unknown: ${status}`);
}
```

| Situation | Prefer |
| --------- | ------ |
| Two or more branches on the **same** enum / union value | `switch` |
| Single equality check | `if` is fine |
| Unrelated conditions | separate `if`s or early returns |

---

## String normalization — trim before save, trust on read

**Trim (and validate) string fields once at ingest** — when parsing Excel, accepting HTTP bodies, or building rows for `create` / `update`. Do **not** `.trim()` again when reading those fields for business logic or map lookup.

| Stage | Rule |
| ----- | ---- |
| **Ingest / save** | Apply `.trim()` here; persist trimmed strings only. |
| **Read / resolve** | Use DB strings **as stored**; `Map.get(key)` with keys that match exact stored literals. |
| **Case-fold / prefix rules** | Only where matching requires it (e.g. `id.toLowerCase()` for ASCII prefixes), not on every label field. |

```typescript
// ✅ GOOD — trim on import; lookup uses stored literal
sku: row.getCell(col).text.trim(),
// ...
return skuMap.get(sku);

// ❌ BAD — re-trim or re-normalize values already from DB
return skuMap.get(sku.trim().toLowerCase());
```

**Normalization helpers:** use for **runtime matching** where inputs are **not** guaranteed trimmed. Do **not** use on fields whose contract is "trimmed at save".
