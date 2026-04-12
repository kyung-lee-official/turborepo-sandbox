# Store API — carts (`/store-api/carts`)

Custom store-facing cart routes. They initialize and maintain `metadata.unselected` for “set aside” lines, apply `display_lines` ordering, and run catalog sync on relevant writes.

**Auth:** Send Medusa’s publishable key header `x-publishable-api-key`. Customer session or bearer JWT is required only where noted.

**Query (most GET/POST cart routes):** Optional `fields` — comma-separated cart graph fields (Medusa select params), e.g. `fields=*items`.

---

## `POST /store-api/carts`

Create a cart (guest or signed-in). Server always sets `metadata: { unselected: {} }` on create; do not rely on client `metadata` for unselected state.

**Body (JSON)** — all keys optional unless you need them; `region_id` is typical for guests:

```json
{
  "region_id": "reg_01...",
  "sales_channel_id": "sc_01...",
  "email": "shopper@example.com",
  "currency_code": "usd",
  "promo_codes": ["SUMMER10"],
  "locale": "en-US",
  "additional_data": {}
}
```

**Note**

- For signed-in customers, `customer_id` is inferred from auth when present. Guests may call this route without a session (`allowUnauthenticated: true`).

---

## `GET /store-api/carts`

Return the active incomplete cart for the authenticated customer, or create one for the given region. **Requires a logged-in customer** (session cookie or bearer JWT); callers without that context receive **401**.

**Query (required / optional)**

```http
GET /store-api/carts?region_id=reg_01...&sales_channel_id=sc_01...&fields=*items
```

- `region_id` — **required**
- `sales_channel_id` — optional
- `fields` — optional

**Note**

- Picks the latest incomplete cart for that customer, `region_id`, and optional `sales_channel_id`.

---

## `GET /store-api/carts/:id`

Fetch a cart by id.

**Query (optional)**

```http
GET /store-api/carts/cart_01...?fields=*items,metadata
```

**Note**

- `display_lines` appears when the refetch includes the fields needed to build it (full refetch path).

---

## `POST /store-api/carts/:id`

Update cart fields allowed by Medusa’s store update DTO **except** top-level `metadata` (stripped from schema). Use workflows and the routes below for `metadata.unselected` / line behavior.

**Body (JSON)** — example only; see `@medusajs/medusa` `UpdateCart` for the full shape:

```json
{
  "email": "shopper@example.com",
  "additional_data": {}
}
```

**Note**

- Cart `metadata` is not accepted here; updates use the core cart update path without client-controlled metadata.

---

## Quantity changes: `line-items` vs `line-items/:line_id` vs `variants/.../quantity`

These three routes can all change how many units of a SKU appear in the cart, but they target different identities and states:

| Goal                                                                                                                                                               | Endpoint                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| **Add** units of a variant using standard “add to cart” semantics (may merge with an existing **selected** line)                                                   | `POST .../line-items`                    |
| **Set quantity** for one **existing cart line** by `line_id` (use when multiple lines per variant or UI is strictly line-keyed; otherwise prefer variant quantity) | `POST .../line-items/:line_id`           |
| **Set one absolute total** for a **variant** everywhere it appears — selected line(s) **and/or** `metadata.unselected` (set-aside)                                 | `POST .../variants/:variant_id/quantity` |

**Prefer `variants/.../quantity`** whenever you only need a **total per variant** (including set-aside), or the variant might be set-aside only. Use **`line-items/:line_id`** only when you must adjust a specific **row** by `line_id` (multiple lines per variant, or strict line-keyed UI). Use **`line-items`** when you are **adding** stock by variant, not replacing a known total.

---

## `POST /store-api/carts/:id/line-items`

Add **selected** line items (normal cart lines). `quantity` must be a positive integer.

**When to use**

- Product detail / listing **“Add to cart”** (and similar) where you add `n` units **by `variant_id`** and do not have a line id yet.
- The variant must **not** exist only in `metadata.unselected`; if it does, use `POST .../variants/:variant_id/quantity` instead.

**Body (JSON)**

```json
{
  "variant_id": "variant_01...",
  "quantity": 2
}
```

**Note**

- If that `variant_id` exists **only** in `metadata.unselected` (set-aside), this route returns **400** with `CART.USE_VARIANT_QUANTITY_ENDPOINT` — use `POST .../variants/:variant_id/quantity` to set absolute quantity instead.
- Adding the same variant again may merge into an existing line (normal Medusa add-to-cart behavior).

---

## `POST /store-api/carts/:id/line-items/:line_id`

Set **absolute quantity** for an existing **line item** (`line_id` = Medusa line item id). Unknown `line_id` returns **404** with `CART.ITEM_NOT_FOUND`.

**Note**

- **Prefer `POST .../variants/:variant_id/quantity` first** when you only need to set **how many units of a variant** the customer has in the cart (typical case: at most **one selected line** per variant). That route also covers **set-aside** (`metadata.unselected`) in one call.
- **Use this route** when you must target a **specific cart row** by **`line_id`** — e.g. **multiple lines** for the same variant could exist, or the UI is strictly **line-keyed** and must not rely on variant-level aggregation (merge/split) behavior.

**When to use**

- Cart UI where each **checkout row** maps to `items[].id` **and** the cases above apply — quantity steppers, manual qty input, or **remove this row** via `quantity: 0`.
- You are intentionally editing **that line record**, not declaring a global total for the variant (no direct handling of set-aside `metadata.unselected` for the same variant beyond workflow cleanup of invalid splits).

**Body (JSON)**

```json
{
  "quantity": 3
}
```

`quantity` is a non-negative integer.

**Note**

- **`quantity: 0`** deletes that line item (same as removing the row).
- If both a line and `metadata.unselected` existed for that variant (invalid split), the workflow clears the unselected side for that variant before applying the update.

---

## `DELETE /store-api/carts/:id/line-items/:line_id/unselect`

Move the given **selected** line into `metadata.unselected` (same total quantity, product snapshot). The line row is removed from `items`.

**Body:** none.

**Note**

- Unselected snapshots are aligned with the catalog in later workflow steps (titles, prices, etc.).

---

## `POST /store-api/carts/:id/variants/:variant_id/quantity`

Set **absolute quantity for a variant** across the cart: adjusts selected line(s) and/or set-aside (`unselected`) so the variant’s effective quantity matches the payload. `variant_id` is the path parameter.

**When to use**

- **Set-aside** rows keyed by `variant_id` in `metadata.unselected` (including increasing qty, or **`quantity: 0`** to drop the variant entirely from the cart).
- Any time you want **one API** to mean “this variant’s total in the cart,” regardless of whether it is currently a line item, set-aside, or needs to move between those states.
- After **unselect**, raising or lowering held-aside qty without a `line_id` — this is the supported path (adding via `line-items` is rejected with `CART.USE_VARIANT_QUANTITY_ENDPOINT`).

**Body (JSON)**

```json
{
  "quantity": 1
}
```

`quantity` is an integer **≥ 0**.

**Note**

- **`quantity: 0`** removes every line item for that variant **and** drops that variant from `metadata.unselected` (including related `item_original_created_at` cleanup when nothing remains for that variant).
- If both a line and `unselected` existed for the same variant (invalid split), the workflow drops the unselected side and logs a warning, then applies the new quantity.
- When the variant exists **only** as set-aside, use this route to raise quantity — `POST .../line-items` is rejected in that situation (`CART.USE_VARIANT_QUANTITY_ENDPOINT`).

---

## `POST /store-api/carts/:id/delete-line-item`

Delete a **selected** line item by id. Malformed or empty body fails validation (**400**).

**Body (JSON)**

```json
{
  "item_id": "item_01..."
}
```

`item_id` is the Medusa **line item** id (not the variant id).

**Note**

- To remove a **set-aside** variant completely, call `POST .../variants/:variant_id/quantity` with **`"quantity": 0`** instead.

---

## Responses

Successful handlers return a store cart payload shaped like Medusa’s cart JSON, with:

- `metadata.unselected` — map keyed by `variant_id`
- `display_lines` — interleaved `{ kind, item }` rows for UI ordering (when refetched with sufficient fields)

Error payloads use `@repo/types` `HttpError` codes where thrown (e.g. `CART.*`, `AUTH.*`).

---

## Blocked legacy routes (same middleware module)

These **Medusa default** paths respond with **403** and instruct callers to use `/store-api/carts` equivalents:

| Method | Path                                   |
| ------ | -------------------------------------- |
| `POST` | `/store/carts`                         |
| `POST` | `/store/carts/:id`                     |
| `POST` | `/store/carts/:id/line-items`          |
| `POST` | `/store/carts/:id/line-items/:line_id` |

They exist so clients do not accidentally use core store cart handlers that bypass this module’s metadata and workflows.

---

## 中文

面向店铺的自定义购物车接口。用于初始化并维护「暂存」行对应的 `metadata.unselected`、对 `display_lines` 排序，并在相关写入后同步商品目录。

**认证：** 请求需携带 Medusa 的可发布密钥请求头 `x-publishable-api-key`。仅在下文注明处需要顾客会话或 Bearer JWT。

**查询参数（多数 GET/POST 购物车接口）：** 可选 `fields` — 逗号分隔的购物车图字段（Medusa 的 select 参数），例如 `fields=*items`。

---

### `POST /store-api/carts`

创建购物车（访客或已登录）。创建时服务端始终设置 `metadata: { unselected: {} }`；勿依赖客户端传入的 `metadata` 来管理未选中状态。

**请求体（JSON）** — 除实际需要外均可省略；访客场景通常带 `region_id`：

```json
{
  "region_id": "reg_01...",
  "sales_channel_id": "sc_01...",
  "email": "shopper@example.com",
  "currency_code": "usd",
  "promo_codes": ["SUMMER10"],
  "locale": "en-US",
  "additional_data": {}
}
```

**说明**

- 已登录顾客在存在认证信息时会从认证上下文推断 `customer_id`。访客可在无会话情况下调用（`allowUnauthenticated: true`）。

---

### `GET /store-api/carts`

返回当前已登录顾客的未完成购物车，或按给定区域新建一辆。**必须已登录顾客**（会话 Cookie 或 Bearer JWT）；否则返回 **401**。

**查询（必填 / 可选）**

```http
GET /store-api/carts?region_id=reg_01...&sales_channel_id=sc_01...&fields=*items
```

- `region_id` — **必填**
- `sales_channel_id` — 可选
- `fields` — 可选

**说明**

- 在顾客、`region_id` 及可选的 `sales_channel_id` 条件下，选取最近一辆未完成购物车。

---

### `GET /store-api/carts/:id`

按 id 获取购物车。

**查询（可选）**

```http
GET /store-api/carts/cart_01...?fields=*items,metadata
```

**说明**

- 当再次拉取的数据包含构建所需字段时，响应中会出现 `display_lines`（完整 refetch 路径）。

---

### `POST /store-api/carts/:id`

按 Medusa 店铺侧 `UpdateCart` 允许的字段更新购物车，但**不包含**顶层 `metadata`（schema 已剔除）。`metadata.unselected` 与行级行为请用下方专用接口与工作流。

**请求体（JSON）** — 仅为示例；完整字段见 `@medusajs/medusa` 的 `UpdateCart`：

```json
{
  "email": "shopper@example.com",
  "additional_data": {}
}
```

**说明**

- 此处不接受购物车 `metadata`；更新走核心购物车更新路径，不由客户端控制 `metadata`。

---

### 数量变更：`line-items`、`line-items/:line_id` 与 `variants/.../quantity`

三者都会改变购物车中某 SKU 的数量，但针对的**标识**与**状态**不同：

| 目的                                                                                      | 接口                                     |
| ----------------------------------------------------------------------------------------- | ---------------------------------------- |
| 按变体**追加**数量，语义等同常规「加入购物车」（可能与已有**已选中**行合并）              | `POST .../line-items`                    |
| 按 Medusa **行 id** 为**某一行已选中行**设定**绝对数量**（多行同变体或强绑定行 id 时）    | `POST .../line-items/:line_id`           |
| 按**变体**设定**整辆车里该 SKU 的绝对总数**（含已选中行与/或 `metadata.unselected` 暂存） | `POST .../variants/:variant_id/quantity` |

若变体可能**仅**在暂存、或要用**一个数字**表示「该变体在购物车里的总量」，用 **`variants/.../quantity`**（多数场景应**优先**考虑）。仅当必须按 **`line_id`** 精确改**某一行**（多行同变体、UI 强绑定行 id）时用 **`line-items/:line_id`**。若是在**没有行 id** 的情况下按变体**加购**，用 **`line-items`**。

---

### `POST /store-api/carts/:id/line-items`

添加**已选中**的购物车行（普通行）。`quantity` 必须为正整数。

**使用场景**

- 商详 / 列表等 **「加入购物车」**：按 `variant_id` 增加 `n` 件，且尚未持有行 id。
- 该变体不能**仅**存在于 `metadata.unselected`；若仅暂存，应改用 `POST .../variants/:variant_id/quantity`。

**请求体（JSON）**

```json
{
  "variant_id": "variant_01...",
  "quantity": 2
}
```

**说明**

- 若该 `variant_id` **仅**存在于 `metadata.unselected`（暂存），本接口返回 **400**，错误码 `CART.USE_VARIANT_QUANTITY_ENDPOINT` — 应改用 `POST .../variants/:variant_id/quantity` 设置绝对数量。
- 再次添加相同变体可能合并到已有行（Medusa 常规加购行为）。

---

### `POST /store-api/carts/:id/line-items/:line_id`

为已有**行项目**设置**绝对数量**（`line_id` 为 Medusa 行 id）。未知 `line_id` 返回 **404**，错误码 `CART.ITEM_NOT_FOUND`。

**说明**

- **建议优先使用 `POST .../variants/:variant_id/quantity`**：若只需设定顾客购物车中某 **`variant_id`** 的**总件数**（常见情况：每个变体至多一条**已选中**行），用变体数量接口更合适，且**同一请求**可覆盖 **暂存**（`metadata.unselected`）。
- **再使用本接口**：必须按 **`line_id`** 精确操作**某一行**时 — 例如同一变体可能存在**多条行项目**，或 UI **按行绑定**且不能接受按变体聚合时的合并/拆分语义。

**使用场景**

- 购物车 UI 中每一**结算行**对应 `items[].id`，且符合上述「按行」前提时：数量加减、手动输入，或 **`quantity: 0`** 删除**这一行**。
- 明确在改**这一条行记录**的数量，而不是声明「该变体在整辆车的总量」（同一变体的暂存侧由工作流在非法拆分时清理，而非本接口的主要模型）。

**请求体（JSON）**

```json
{
  "quantity": 3
}
```

`quantity` 为非负整数。

**补充说明**

- **`quantity: 0`** 会删除该行（等同于去掉该行）。
- 若同一变体同时存在行与 `metadata.unselected`（非法拆分状态），工作流会在应用更新前清除该变体的未选中侧数据。

---

### `DELETE /store-api/carts/:id/line-items/:line_id/unselect`

将指定**已选中**行移入 `metadata.unselected`（总数量与商品快照保留），该行从 `items` 中移除。

**请求体：** 无。

**说明**

- 后续工作流步骤会将未选中快照与目录对齐（标题、价格等）。

---

### `POST /store-api/carts/:id/variants/:variant_id/quantity`

按**变体**在整辆购物车中设置**绝对数量**：调整已选行和/或暂存（`unselected`），使该变体的有效数量与请求体一致。`variant_id` 为路径参数。

**使用场景**

- `metadata.unselected` 中按 `variant_id` 存放的**暂存**行（提高/降低数量，或 **`quantity: 0`** 从购物车中彻底去掉该变体）。
- 需要**一个接口**表达「该变体在购物车里的总量」，无论当前表现为行项目、暂存，还是要在两者之间迁移。
- **取消选中（unselect）之后**，没有 `line_id` 却要改暂存数量 — 应走本接口（此时 `POST .../line-items` 会返回 `CART.USE_VARIANT_QUANTITY_ENDPOINT`）。

**请求体（JSON）**

```json
{
  "quantity": 1
}
```

`quantity` 为 **≥ 0** 的整数。

**说明**

- **`quantity: 0`** 会删除该变体下所有行项目，并从 `metadata.unselected` 中移除该变体（若该变体在购物车中不再存在，还会清理相关的 `item_original_created_at`）。
- 若同一变体同时存在行与 `unselected`（非法拆分），工作流会丢弃未选中侧并打日志警告，再应用新数量。
- 变体**仅**以暂存形式存在时，要提高数量应使用本接口 — 此时 `POST .../line-items` 会被拒绝（`CART.USE_VARIANT_QUANTITY_ENDPOINT`）。

---

### `POST /store-api/carts/:id/delete-line-item`

按 id 删除**已选中**行。请求体不合法或为空时校验失败（**400**）。

**请求体（JSON）**

```json
{
  "item_id": "item_01..."
}
```

`item_id` 为 Medusa **行项目** id（不是变体 id）。

**说明**

- 要彻底移除**暂存**变体，请改用 `POST .../variants/:variant_id/quantity` 且 **`"quantity": 0`**。

---

### 响应

成功时返回与 Medusa 购物车 JSON 形态一致的载荷，并包含：

- `metadata.unselected` — 以 `variant_id` 为键的映射
- `display_lines` — 用于 UI 排序的 `{ kind, item }` 交错行（在 refetch 字段足够时）

抛出 `HttpError` 时，错误体使用 `@repo/types` 中的错误码（如 `CART.*`、`AUTH.*`）。

---

### 已禁用的旧版路由（同一中间件模块）

以下 **Medusa 默认**路径返回 **403**，并提示调用方改用 `/store-api/carts` 对应接口：

| 方法   | 路径                                   |
| ------ | -------------------------------------- |
| `POST` | `/store/carts`                         |
| `POST` | `/store/carts/:id`                     |
| `POST` | `/store/carts/:id/line-items`          |
| `POST` | `/store/carts/:id/line-items/:line_id` |

用于避免客户端误用核心店铺购物车接口，从而绕过本模块的 `metadata` 与工作流。
