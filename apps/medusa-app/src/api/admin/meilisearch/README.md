# Admin API — Meilisearch (`/admin/meilisearch`)

Custom **admin-only** routes to trigger product sync and to **proxy** Meilisearch management APIs (indexes, documents, embedders, tasks). All routes here use Medusa `authenticate("user", ["session", "bearer"])` — the admin UI / API client must send a **valid admin (`user`)** session cookie or bearer JWT, plus your usual `x-publishable-api-key` if your HTTP client attaches it globally.

Implementation lives under `sync/`, `management/`, and `middlewares.ts` (merged in `src/api/middlewares.ts`).

---

## `POST /admin/meilisearch/sync`

Emit `meilisearch.sync` on the event bus so the subscriber can run a full product re-index (published products only; see module subscriber).

**Body:** none.

**Response (200)**

```json
{
  "message": "Product synchronization to Meilisearch has been initiated",
  "status": "pending"
}
```

---

## Management base: `/admin/meilisearch/management`

Proxied to the Meilisearch HTTP API using the module’s configured host and API key. Mutating operations typically return **202** with an async **task** payload from Meilisearch.

---

## `GET /admin/meilisearch/management/tasks`

Returns the latest Meilisearch tasks: **newest first** (Meilisearch default descending `uid` order). Response is capped to **3** entries in `results` (see `management/tasks/route.ts`).

**Body:** none.

---

## `GET /admin/meilisearch/management/indexes`

List indexes (pass-through to Meilisearch).

**Query (optional)**

| Param    | Description        |
| -------- | ------------------ |
| `limit`  | Positive integer.  |
| `offset` | Non-negative int.  |

---

## `POST /admin/meilisearch/management/indexes`

Create an index.

**Body (JSON)** — validated by `AdminMeilisearchCreateIndexBody`:

```json
{
  "uid": "products",
  "primaryKey": "id"
}
```

- `primaryKey` defaults to **`id`** if omitted.

**Response:** **202** + Meilisearch task (typical).

---

## `DELETE /admin/meilisearch/management/indexes/:indexUid`

Delete the **entire** index (not only documents).

**Body:** none.

**Response:** **202** + Meilisearch task (typical).

**Note**

- Deleting the index whose `uid` matches `MEILISEARCH_PRODUCT_INDEX_NAME` breaks store search until the index is recreated and data re-synced.

---

## `GET /admin/meilisearch/management/indexes/:indexUid/embedders`

Get embedders settings for the index.

---

## `PATCH /admin/meilisearch/management/indexes/:indexUid/embedders`

Replace embedders configuration. Body must be a **JSON object** (validated with Zod in the route handler).

**Body (JSON)** — example shape (see Meilisearch docs for your embedder type):

```json
{
  "default": {
    "source": "openAi",
    "model": "text-embedding-3-small",
    "apiKey": "…"
  }
}
```

**Response:** **202** + task.

---

## `POST /admin/meilisearch/management/indexes/:indexUid/embedders/preset`

Apply the **built-in REST embedder preset** (Ollama `bge-m3:latest` at `http://127.0.0.1:11434/api/embed`, dimensions 1024, document template for `doc.name` / `doc.description` / `doc.category`). Implemented in `src/modules/meilisearch/rest-embedder-preset.ts`.

**Body:** none.

**Response:** **202** + task (same as PATCH embedders).

---

## `DELETE /admin/meilisearch/management/indexes/:indexUid/embedders`

Reset embedders to Meilisearch defaults for that index.

**Body:** none.

**Response:** **202** + task.

---

## `GET /admin/meilisearch/management/indexes/:indexUid/documents`

Browse documents in the index.

**Query (optional)** — see `AdminMeilisearchDocumentsQuery` in `management/validators.ts`:

| Param             | Description |
| ----------------- | ----------- |
| `limit`           | 1–1000      |
| `offset`          | ≥ 0         |
| `fields`          | Comma-separated field names |
| `filter`          | Meilisearch filter string   |
| `retrieveVectors` | `true` / `false`            |

---

## `POST /admin/meilisearch/management/indexes/:indexUid/documents`

Add or replace documents. Body must be a **JSON array** of objects; the server calls Meilisearch with **`primaryKey=id`**.

**Body (JSON)**

```json
[
  { "id": "prod_01", "title": "Example" }
]
```

**Response:** **202** + task.

**Note**

- Validation uses `AdminMeilisearchDocumentsBody` (min one element) in the route handler.

---

## `DELETE /admin/meilisearch/management/indexes/:indexUid/documents`

Delete **all** documents in the index (index itself remains).

**Body:** none.

**Response:** **202** + task.

---

## Related layout

| Path | Purpose |
| ---- | ------- |
| `sync/route.ts` | Product sync trigger |
| `management/tasks/route.ts` | List tasks |
| `management/indexes/route.ts` | List + create indexes |
| `management/indexes/[indexUid]/route.ts` | Delete index |
| `management/indexes/[indexUid]/embedders/route.ts` | GET / PATCH / DELETE embedders |
| `management/indexes/[indexUid]/embedders/preset/route.ts` | POST preset embedder |
| `management/indexes/[indexUid]/documents/route.ts` | GET / POST / DELETE documents |
| `management/validators.ts` | Zod schemas for bodies/queries |
| `middlewares.ts` | Auth + validation middleware routes |

---

## 中文

面向 **管理员** 的自定义路由：触发商品同步，并 **代理** Meilisearch 的管理 API（索引、文档、嵌入器、任务）。上述路由均使用 Medusa 的 `authenticate("user", ["session", "bearer"])` —— 管理后台或 API 客户端必须发送 **有效的管理员（`user`）** 会话 Cookie 或 Bearer JWT；若 HTTP 客户端全局附带 `x-publishable-api-key`，一般也会一并发送。

实现位于 `sync/`、`management/` 以及 `middlewares.ts`（在 `src/api/middlewares.ts` 中合并注册）。

---

### `POST /admin/meilisearch/sync`

在事件总线上发出 `meilisearch.sync`，由订阅者执行全量商品重索引（仅已发布商品；详见模块订阅者）。

**请求体：** 无。

**响应（200）**

```json
{
  "message": "Product synchronization to Meilisearch has been initiated",
  "status": "pending"
}
```

---

### 管理接口基路径：`/admin/meilisearch/management`

请求被转发到 Meilisearch HTTP API，使用模块配置的主机与 API 密钥。变更类操作通常返回 **202**，响应体为 Meilisearch 的异步 **task** 信息。

---

### `GET /admin/meilisearch/management/tasks`

返回最近的 Meilisearch 任务：**新任务在前**（Meilisearch 默认按 `uid` 降序）。`results` 数组最多 **3** 条（见 `management/tasks/route.ts`）。

**请求体：** 无。

---

### `GET /admin/meilisearch/management/indexes`

列出索引（透传至 Meilisearch）。

**查询（可选）**

| 参数     | 说明           |
| -------- | -------------- |
| `limit`  | 正整数。       |
| `offset` | 非负整数。     |

---

### `POST /admin/meilisearch/management/indexes`

创建索引。

**请求体（JSON）** — 由 `AdminMeilisearchCreateIndexBody` 校验：

```json
{
  "uid": "products",
  "primaryKey": "id"
}
```

- 省略 `primaryKey` 时默认为 **`id`**。

**响应：** **202** + Meilisearch task（常见形态）。

---

### `DELETE /admin/meilisearch/management/indexes/:indexUid`

删除 **整个** 索引（不是仅删文档）。

**请求体：** 无。

**响应：** **202** + Meilisearch task（常见形态）。

**说明**

- 若被删索引的 `uid` 与 `MEILISEARCH_PRODUCT_INDEX_NAME` 一致，在重建索引并重新同步数据之前，店铺检索将不可用。

---

### `GET /admin/meilisearch/management/indexes/:indexUid/embedders`

获取该索引的嵌入器（embedders）配置。

---

### `PATCH /admin/meilisearch/management/indexes/:indexUid/embedders`

替换嵌入器配置。请求体必须是 **JSON 对象**（在路由内用 Zod 校验）。

**请求体（JSON）** — 示例结构（具体字段以 Meilisearch 文档及所用嵌入器类型为准）：

```json
{
  "default": {
    "source": "openAi",
    "model": "text-embedding-3-small",
    "apiKey": "…"
  }
}
```

**响应：** **202** + task。

---

### `POST /admin/meilisearch/management/indexes/:indexUid/embedders/preset`

应用 **内置 REST 嵌入器预设**（Ollama `bge-m3:latest`，端点 `http://127.0.0.1:11434/api/embed`，维度 1024，文档模板使用 `doc.name` / `doc.description` / `doc.category`）。实现见 `src/modules/meilisearch/rest-embedder-preset.ts`。

**请求体：** 无。

**响应：** **202** + task（与 PATCH embedders 一致）。

---

### `DELETE /admin/meilisearch/management/indexes/:indexUid/embedders`

将该索引的嵌入器恢复为 Meilisearch 默认行为。

**请求体：** 无。

**响应：** **202** + task。

---

### `GET /admin/meilisearch/management/indexes/:indexUid/documents`

浏览索引中的文档。

**查询（可选）** — 详见 `management/validators.ts` 中的 `AdminMeilisearchDocumentsQuery`：

| 参数               | 说明 |
| ------------------ | ---- |
| `limit`            | 1–1000 |
| `offset`           | ≥ 0 |
| `fields`           | 逗号分隔的字段名 |
| `filter`           | Meilisearch 过滤表达式 |
| `retrieveVectors`  | `true` / `false` |

---

### `POST /admin/meilisearch/management/indexes/:indexUid/documents`

新增或替换文档。请求体为 **JSON 数组**（对象列表）；服务端调用 Meilisearch 时固定使用 **`primaryKey=id`**。

**请求体（JSON）**

```json
[
  { "id": "prod_01", "title": "Example" }
]
```

**响应：** **202** + task。

**说明**

- 路由内使用 `AdminMeilisearchDocumentsBody` 校验（至少一个元素）。

---

### `DELETE /admin/meilisearch/management/indexes/:indexUid/documents`

删除该索引下的 **全部** 文档（索引本身保留）。

**请求体：** 无。

**响应：** **202** + task。

---

### 相关文件布局

| 路径 | 用途 |
| ---- | ---- |
| `sync/route.ts` | 触发商品同步 |
| `management/tasks/route.ts` | 列出任务 |
| `management/indexes/route.ts` | 列出 / 创建索引 |
| `management/indexes/[indexUid]/route.ts` | 删除索引 |
| `management/indexes/[indexUid]/embedders/route.ts` | GET / PATCH / DELETE 嵌入器 |
| `management/indexes/[indexUid]/embedders/preset/route.ts` | POST 预设嵌入器 |
| `management/indexes/[indexUid]/documents/route.ts` | GET / POST / DELETE 文档 |
| `management/validators.ts` | 请求体与查询的 Zod schema |
| `middlewares.ts` | 认证与校验相关中间件路由 |
