# Store API — search (`/store-api/search`)

Custom store-facing **Meilisearch** product search with optional **hybrid** (keyword + vector) blending. Queries the index configured for the Meilisearch module (`MEILISEARCH_PRODUCT_INDEX_NAME`).

**Auth:** Send Medusa’s publishable key header `x-publishable-api-key`. No customer session is required unless you add stricter middleware later.

**Validation:** Query params are validated via `validateAndTransformQuery` (`StoreSearchQuery` in `validators.ts`).

---

## `GET /store-api/search`

Hybrid / vector-blended search against the **product** index.

**Query**

```http
GET /store-api/search?q=wool&hybridEmbedder=0.5
```

| Param            | Required | Description |
| ---------------- | -------- | ----------- |
| `q`              | **yes**  | Search string (trimmed, non-empty). |
| `hybridEmbedder` | no       | Omit → semantic ratio **0.5**, embedder name **`default`**. Literal **`default`** (case-insensitive) → same as omit. Otherwise a decimal in **[0, 1]** for `semanticRatio` (embedder stays **`default`**). |

**Note**

- Invalid `hybridEmbedder` values fail validation (**400**).
- The handler forwards `hybrid: { embedder, semanticRatio }` to Meilisearch; your index must have hybrid/embedder settings compatible with this mode.

**Response (JSON)** — shape:

```json
{
  "query": "wool",
  "hybrid": { "embedder": "default", "semanticRatio": 0.5 },
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 42
  },
  "hits": [],
  "processingTimeMs": 3
}
```

- `hits` — Meilisearch hit documents.
- `pagination.limit` / `offset` — echo from Meilisearch where available; defaults align with the module service.

**Errors**

- **500** — `SEARCH_ERROR` when Meilisearch is unreachable or returns an error (message in payload).

---

## Related files

| File            | Role                          |
| --------------- | ----------------------------- |
| `route.ts`      | `GET` handler                 |
| `validators.ts` | Zod query schema              |
| `middlewares.ts`| `validateAndTransformQuery`   |
| `query-config.ts` | Medusa query transform config |

Module implementation: `src/modules/meilisearch/`.

---

## 中文

面向店铺的自定义 **Meilisearch** 商品检索，支持可选的 **hybrid**（关键词 + 向量）混合。查询的是 Meilisearch 模块所配置的产品索引（环境变量 `MEILISEARCH_PRODUCT_INDEX_NAME`）。

**认证：** 请求需携带 Medusa 的可发布密钥请求头 `x-publishable-api-key`。当前不要求顾客会话；若日后在中间件中收紧策略，以实际中间件为准。

**校验：** 查询参数通过 `validateAndTransformQuery` 校验（`validators.ts` 中的 `StoreSearchQuery`）。

---

### `GET /store-api/search`

针对 **product** 索引的 hybrid / 向量混合检索。

**查询**

```http
GET /store-api/search?q=wool&hybridEmbedder=0.5
```

| 参数               | 是否必填 | 说明 |
| ------------------ | -------- | ---- |
| `q`                | **是**   | 检索字符串（去首尾空格，不能为空）。 |
| `hybridEmbedder`   | 否       | 不传 → 语义比例 **0.5**，嵌入器名 **`default`**。字面量 **`default`**（大小写不敏感）与不传相同。否则为 **[0, 1]** 区间内的小数，作为 `semanticRatio`（嵌入器名仍为 **`default`**）。 |

**说明**

- 非法的 `hybridEmbedder` 会校验失败（**400**）。
- 处理器会把 `hybrid: { embedder, semanticRatio }` 传给 Meilisearch；索引需具备与该模式兼容的 hybrid / 嵌入器配置。

**响应（JSON）** — 结构示例：

```json
{
  "query": "wool",
  "hybrid": { "embedder": "default", "semanticRatio": 0.5 },
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 42
  },
  "hits": [],
  "processingTimeMs": 3
}
```

- `hits` — Meilisearch 返回的命中文档。
- `pagination.limit` / `offset` — 在 Meilisearch 有返回时回显；默认值与模块内服务逻辑一致。

**错误**

- **500** — Meilisearch 不可达或返回错误时为 `SEARCH_ERROR`（具体信息在响应体中）。

---

### 相关文件

| 文件               | 作用 |
| ------------------ | ---- |
| `route.ts`         | `GET` 处理函数 |
| `validators.ts`    | Zod 查询 schema |
| `middlewares.ts`   | `validateAndTransformQuery` |
| `query-config.ts` | Medusa 查询转换配置 |

模块实现目录：`src/modules/meilisearch/`。
