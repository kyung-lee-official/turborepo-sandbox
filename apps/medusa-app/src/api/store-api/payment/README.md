# Store API & hooks — OceanPayment (`/store-api/payment/initialize-payment-session`, `/hooks/payment/oceanpayment_oceanpayment`)

Custom **OceanPayment Hosted Checkout** only: `sendTrade`, redirect to `pay_url`, optional asynchronous XML **`noticeUrl`**, synchronous form **`backUrl`** (verified then **303** to the storefront). This stack does **not** implement Embedded checkout, server-to-server card APIs, payment links, or POS.

Official docs: [OceanPayment — Payment](https://dev.oceanpayment.com/en/docs/payment/introduction), [Hosted Checkout integration](https://dev.oceanpayment.com/en/docs/payment/host-page/integration), [Signatures (Hosted Checkout)](https://dev.oceanpayment.com/en/docs/compliance-and-security/sign/payment), [Checkout webhook (XML)](https://dev.oceanpayment.com/en/docs/webhook/payments/checkout).

**Auth (store route):** Send Medusa’s publishable key header `x-publishable-api-key`. No extra customer JWT is required for this path unless you tighten middleware later (see commented matchers in `src/api/middlewares.ts`).

**Auth (hook routes):** Ocean and the shopper’s browser call these URLs directly. There is no Medusa customer session; trust **HTTPS**, **`signValue` verification**, and **secret** configuration (`OCEANPAYMENT_SECURE_CODE`).

**Module:** `src/modules/ocean-payment/` — provider `initiatePayment` / `sendTrade`, signing, XML helpers, webhook lookup.

---

## `POST /store-api/payment/initialize-payment-session/:paymentCollectionId`

Creates payment session(s) via Medusa’s `createPaymentSessionsWorkflow`. For carts linked to the collection, the handler loads the cart graph and passes **workflow context** used by the Ocean provider: `billing_ip` (from forwarded headers), `ocean_cart_lines` (line summaries for `sendTrade` product fields), plus `shipping_address`, `customer_email`, and `custom_id` (cart id).

**Path**

```http
POST /store-api/payment/initialize-payment-session/paycol_01...
```

| Param                    | Required | Description                                      |
| ------------------------ | -------- | ------------------------------------------------ |
| `paymentCollectionId`    | **yes**  | Medusa payment collection id (path segment).     |

**Body (JSON)** — Medusa store shape `StoreInitializePaymentSession`; Ocean example:

```json
{
  "provider_id": "pp_oceanpayment_oceanpayment",
  "data": {
    "intent": "CAPTURE",
    "methods": "Credit Card"
  }
}
```

| Field          | Required | Description                                                                 |
| -------------- | -------- | --------------------------------------------------------------------------- |
| `provider_id`  | **yes**  | Payment provider id, e.g. `pp_oceanpayment_oceanpayment`.                   |
| `data`         | no       | Provider payload; for Ocean, optional `intent`, `methods` (`Credit Card` \| `ApplePay` \| `GooglePay`), etc. |

**Note**

- Allowed `methods` values are enforced in the Ocean provider; invalid values surface as `@repo/types` `HttpError` codes under `PAYMENT.OCEANPAYMENT_*`.
- Default Medusa provider id is `pp_oceanpayment_oceanpayment`; override with env `OCEANPAYMENT_MEDUSA_PAYMENT_PROVIDER_ID` (see module `config.ts`).
- Hosted-checkout method constants: `src/modules/ocean-payment/hosted-checkout-methods.ts`.

**Errors**

- **4xx** — `HttpError` from the handler or workflows, e.g. `PAYMENT.MISSING_PAYMENT_PROVIDER`, `PAYMENT.RESOURCE_NOT_FOUND` when the collection has no cart.

**Response**

- **200** — workflow result from `createPaymentSessionsWorkflow` (Medusa payment session payload shape).

---

## `POST /hooks/payment/oceanpayment_oceanpayment`

Ocean’s asynchronous **`noticeUrl`**: **raw XML** body after checkout. The handler parses the notice, verifies **`signValue`**, and when `payment_status === "1"` runs **`authorizePaymentSession`** then **`customCompleteCartWorkflow`** (same high-level pattern as the PayPal capture webhook). Other cases still persist audit fields on the payment when possible.

**Body**

- Raw XML string (`Content-Type` often `text/xml` or similar). Middleware sets **`bodyParser: false`** for this matcher so the handler can read the raw stream.

**Success response**

- **200** — plain text body `receive-ok` (Ocean expectation).

**Error / edge responses (plain `text/plain`)**

| Status | Body                 | When |
| ------ | -------------------- | ---- |
| **400** | `empty-body`         | Missing or non-XML body. |
| **400** | `invalid-sign`       | Signature mismatch. |
| **500** | `misconfigured`      | `OCEANPAYMENT_SECURE_CODE` unset. |
| **500** | `authorize-failed`   | Paid path: authorize failed and session not already in a success-like state. |
| **500** | `complete-cart-failed` | Paid path: cart completion failed (non-concurrent). |

**Note**

- Configure **`OCEANPAYMENT_NOTICE_URL`** to this route’s **public** absolute URL (included on `sendTrade` when set).
- If no `payment_session` matches `order_number` but the signature is valid, the handler still responds **`receive-ok`** and may update payment metadata only — see logs.

---

## `POST /hooks/payment/oceanpayment_oceanpayment/back`

Synchronous **`backUrl`**: Ocean POSTs **`application/x-www-form-urlencoded`** (including `signValue`). After verification, Medusa responds with **303 See Other** and **`Location`** = `OCEANPAYMENT_PAYMENT_RESULT_REDIRECT_BASE` plus an **allowlisted** subset of fields as query parameters (**never** `signValue`; **`card_number`** is not copied into the query string).

**Body**

- URL-encoded form fields per Ocean “synchronous return” (same signing concatenation as `noticeUrl` for verification).

**Success response**

- **303** — `Location` set to the storefront URL with safe query params.

**Error responses (plain `text/plain`)**

| Status | Body                 | When |
| ------ | -------------------- | ---- |
| **400** | `invalid-sign`       | Missing or bad `signValue`. |
| **500** | `misconfigured`      | `OCEANPAYMENT_SECURE_CODE` or `OCEANPAYMENT_PAYMENT_RESULT_REDIRECT_BASE` unset. |
| **500** | `bad-redirect-base`  | `OCEANPAYMENT_PAYMENT_RESULT_REDIRECT_BASE` is not a valid URL. |

**Note**

- Set **`OCEANPAYMENT_BACK_URL`** to this route’s absolute URL. **`backUrl` is part of `sendTrade` request signing** — change it only together with a **new** checkout / session from the storefront.
- **Allowlisted query keys:** `payment_id`, `payment_status`, `order_number`, `order_currency`, `order_amount`, `order_notes`, `methods`, `payment_authType`, `payment_details`, `payment_risk`, `account`, `terminal`, `response_type`.

---

## Environment variables

| Variable                                    | Required              | Purpose |
| ------------------------------------------- | --------------------- | ------- |
| `OCEANPAYMENT_ACCOUNT`                      | Yes (runtime)         | Merchant account (provider option). |
| `OCEANPAYMENT_TERMINAL`                     | Yes (runtime)         | Terminal (provider option). |
| `OCEANPAYMENT_SECURE_CODE`                  | Yes (runtime)         | Signing secret: `sendTrade`, responses, `noticeUrl`, `backUrl`. |
| `OCEANPAYMENT_BACK_URL`                     | Yes (runtime)         | Absolute URL for synchronous POST (this Medusa **`…/back`** route); included in **`sendTrade`** signature. |
| `OCEANPAYMENT_PAYMENT_RESULT_REDIRECT_BASE` | Yes for `/back`       | Storefront base URL (no query); used for **303** after verified `backUrl`. |
| `OCEANPAYMENT_NOTICE_URL`                   | Optional              | If set, sent on `sendTrade` as `noticeUrl` (async XML webhook). |
| `OCEANPAYMENT_GATEWAY_BASE_URL`             | Optional              | Override Ocean gateway host (defaults by `NODE_ENV`). |
| `OCEANPAYMENT_HOSTED_REDIRECT_MODE`         | Optional              | `merchant_control` (default) or auto redirect per Ocean matrix. |
| `OCEANPAYMENT_LINE_AMOUNTS_MINOR_UNITS`      | Optional              | Cart line totals as minor units when `true` (default). |
| `OCEANPAYMENT_FALLBACK_BILLING_IP`          | Optional              | Fallback when billing IP cannot be derived from headers. |
| `OCEANPAYMENT_MEDUSA_PAYMENT_PROVIDER_ID`    | Optional              | Override default `pp_oceanpayment_oceanpayment`. |

See `apps/medusa-app/.env.template` and `src/modules/ocean-payment/config.ts`.

---

## HTTP errors (`@repo/types`)

Ocean-related store/provider codes: `packages/types/src/http-error/codes/payment.ts` — keys prefixed with `PAYMENT.OCEANPAYMENT_*`.

---

## Operational checklist

1. Set **account / terminal / secureCode** and **`OCEANPAYMENT_BACK_URL`** / **`OCEANPAYMENT_PAYMENT_RESULT_REDIRECT_BASE`** on Medusa.
2. Expose **`noticeUrl`** publicly if you use **`OCEANPAYMENT_NOTICE_URL`**.
3. After changing **`OCEANPAYMENT_BACK_URL`**, start a **new** payment session so `sendTrade` is re-signed.
4. Ensure `src/api/middlewares.ts` merges **`oceanpaymentOceanpaymentHooksMiddlewares`** (raw body for the XML webhook).

---

## Related files

| Path | Role |
| ---- | ---- |
| `initialize-payment-session/[paymentCollectionId]/route.ts` | Store `POST` — workflow + Ocean context |
| `../../hooks/payment/oceanpayment_oceanpayment/route.ts` | XML `noticeUrl` webhook |
| `../../hooks/payment/oceanpayment_oceanpayment/back/route.ts` | Form `backUrl` → **303** |
| `../../hooks/payment/oceanpayment_oceanpayment/middlewares.ts` | `bodyParser: false` for XML matcher |
| `../../middlewares.ts` | Registers hook middlewares |

Other routes in this folder (`create-payment-collection`, `retrieve-payment`) are separate integrations; this document covers **OceanPayment** only.

---

## 中文

自定义 **OceanPayment 托管收银台（Hosted Checkout）**：`sendTrade`、跳转 `pay_url`、可选异步 XML **`noticeUrl`**、同步表单 **`backUrl`**（校验后 **303** 到店铺前台）。不包含 Embedded、纯服务端卡接口、支付链接或 POS。

官方文档：见上文英文部分的 OceanPayment 链接。

**认证（店铺接口）：** 请求需携带 Medusa 可发布密钥请求头 `x-publishable-api-key`。除非你在 `src/api/middlewares.ts` 中另行收紧策略，本路径不要求额外顾客 JWT。

**认证（钩子接口）：** 由 Ocean 或用户浏览器直接访问；无 Medusa 顾客会话。依赖 **HTTPS**、**`signValue` 校验** 与 **`OCEANPAYMENT_SECURE_CODE`**。

**模块：** `src/modules/ocean-payment/` — 提供方 `sendTrade`、加签、XML 解析、Webhook 查找等。

---

### `POST /store-api/payment/initialize-payment-session/:paymentCollectionId`

通过 Medusa 的 `createPaymentSessionsWorkflow` 创建支付会话。对关联购物车的收款单，会加载购物车图并把 **工作流 context** 传给 Ocean 提供方：`billing_ip`（来自转发头）、`ocean_cart_lines`（行摘要，用于 `sendTrade` 商品字段），以及 `shipping_address`、`customer_email`、`custom_id`（购物车 id）。

**路径**

```http
POST /store-api/payment/initialize-payment-session/paycol_01...
```

| 参数 | 是否必填 | 说明 |
| ---- | -------- | ---- |
| `paymentCollectionId` | **是** | Medusa 收款单 id（路径参数）。 |

**请求体（JSON）** — Medusa 店铺侧 `StoreInitializePaymentSession`；Ocean 示例：

```json
{
  "provider_id": "pp_oceanpayment_oceanpayment",
  "data": {
    "intent": "CAPTURE",
    "methods": "Credit Card"
  }
}
```

| 字段 | 是否必填 | 说明 |
| ---- | -------- | ---- |
| `provider_id` | **是** | 支付提供方 id，例如 `pp_oceanpayment_oceanpayment`。 |
| `data` | 否 | 提供方载荷；Ocean 下可选 `intent`、`methods`（`Credit Card` \| `ApplePay` \| `GooglePay`）等。 |

**说明**

- `methods` 合法值在 Ocean 提供方内校验；非法值会以 `@repo/types` 的 `PAYMENT.OCEANPAYMENT_*` 抛出。
- 默认 Medusa 提供方 id 为 `pp_oceanpayment_oceanpayment`；可用环境变量 `OCEANPAYMENT_MEDUSA_PAYMENT_PROVIDER_ID` 覆盖（见模块 `config.ts`）。
- 托管收银台方式常量：`src/modules/ocean-payment/hosted-checkout-methods.ts`。

**错误**

- **4xx** — 处理器或工作流抛出的 `HttpError`，例如缺少 `provider_id`、收款单无购物车时的 `PAYMENT.RESOURCE_NOT_FOUND`。

**响应**

- **200** — `createPaymentSessionsWorkflow` 的返回结果（Medusa 支付会话形态）。

---

### `POST /hooks/payment/oceanpayment_oceanpayment`

Ocean 异步 **`noticeUrl`**：**原始 XML** 正文。解析后校验 **`signValue`**；当 `payment_status === "1"` 时执行 **`authorizePaymentSession`** 与 **`customCompleteCartWorkflow`**（与 PayPal 捕获类 Webhook 同级流程）。其余情况在可能时仍会把通知审计字段写入 payment。

**请求体**

- 原始 XML 字符串（`Content-Type` 常为 `text/xml` 等）。中间件对该路径关闭 **`bodyParser`**，以便读取原始流。

**成功响应**

- **200** — 纯文本正文 `receive-ok`。

**错误与边界响应（`text/plain`）**

| 状态码 | 正文 | 场景 |
| ------ | ---- | ---- |
| **400** | `empty-body` | 缺 body 或非 XML。 |
| **400** | `invalid-sign` | 签名校验失败。 |
| **500** | `misconfigured` | 未设置 `OCEANPAYMENT_SECURE_CODE`。 |
| **500** | `authorize-failed` | 支付成功路径：授权失败且会话未处于已成功类状态。 |
| **500** | `complete-cart-failed` | 支付成功路径：完成购物车失败（非并发已完成）。 |

**说明**

- 将 **`OCEANPAYMENT_NOTICE_URL`** 配为本路由的**公网**绝对 URL（设置时会在 `sendTrade` 上携带）。
- 若按 `order_number` 找不到 `payment_session` 但验签通过，仍返回 **`receive-ok`**，可能仅更新 payment 元数据 —— 见日志。

---

### `POST /hooks/payment/oceanpayment_oceanpayment/back`

同步 **`backUrl`**：Ocean 以 **`application/x-www-form-urlencoded`** POST（含 `signValue`）。校验通过后 Medusa 返回 **303**，**`Location`** = `OCEANPAYMENT_PAYMENT_RESULT_REDIRECT_BASE` 加**白名单**查询参数（**绝不**带 `signValue`；**不把 `card_number` 写入查询串**）。

**请求体**

- URL 编码表单字段（与 `noticeUrl` 使用相同拼接规则做验签）。

**成功响应**

- **303** — `Location` 为带安全查询参数的前台 URL。

**错误响应（`text/plain`）**

| 状态码 | 正文 | 场景 |
| ------ | ---- | ---- |
| **400** | `invalid-sign` | `signValue` 缺失或错误。 |
| **500** | `misconfigured` | 未设置 `OCEANPAYMENT_SECURE_CODE` 或 `OCEANPAYMENT_PAYMENT_RESULT_REDIRECT_BASE`。 |
| **500** | `bad-redirect-base` | `OCEANPAYMENT_PAYMENT_RESULT_REDIRECT_BASE` 不是合法 URL。 |

**说明**

- **`OCEANPAYMENT_BACK_URL`** 指向本路由绝对 URL；**`backUrl` 参与 `sendTrade` 请求签名** —— 变更后需从店铺侧发起**新**结账/会话。
- **允许出现在重定向查询串的键：** `payment_id`、`payment_status`、`order_number`、`order_currency`、`order_amount`、`order_notes`、`methods`、`payment_authType`、`payment_details`、`payment_risk`、`account`、`terminal`、`response_type`。

---

### 环境变量

见上文英文表格（变量名与用途一致）。

另见 `apps/medusa-app/.env.template` 与 `src/modules/ocean-payment/config.ts`。

---

### HTTP 错误（`@repo/types`）

Ocean 相关店铺/提供方错误码：`packages/types/src/http-error/codes/payment.ts` —— 键名前缀 `PAYMENT.OCEANPAYMENT_*`。

---

### 运维检查清单

1. 在 Medusa 配置 **账户 / 终端 / 安全码** 以及 **`OCEANPAYMENT_BACK_URL`** / **`OCEANPAYMENT_PAYMENT_RESULT_REDIRECT_BASE`**。
2. 若使用 **`OCEANPAYMENT_NOTICE_URL`**，将 **`noticeUrl`** 公网暴露。
3. 修改 **`OCEANPAYMENT_BACK_URL`** 后需**重新**发起支付会话以重签 `sendTrade`。
4. 确认 `src/api/middlewares.ts` 已合并 **`oceanpaymentOceanpaymentHooksMiddlewares`**（XML Webhook 原始 body）。

---

### 相关文件

与上文英文「Related files」表相同（路径相对于 `src/api/store-api/payment/`）。

本目录下 `create-payment-collection`、`retrieve-payment` 等为其他能力；本文仅描述 **OceanPayment**。
