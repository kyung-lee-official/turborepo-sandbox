# HTTP integration tests (Bun) and test database prep

## Layout

- Shared helpers live here (`preload.ts`, `http-session.ts`, `medusa-exec.ts`, `create-test-database.ts`, `reset-test-database.ts`, `prepare-test-db.ts`).
- Colocated **HTTP/API integration** tests for store routes live under `src/**/__tests__/*.integration.test.ts` (for example store carts).

## One `.env.test` for dev + prepare + Bun integration tests

Copy `.env.test.example` to `.env.test` and fill in values. Use it for:

- **`bun run test:dev`** — Medusa develop with the test database and settings
- **`bun run test:db:prepare`** — create DB (if needed), migrate, seed, admin + customer
- **`bun run test:integration:bun`** — Bun HTTP integration tests against the running server

## Prepare Postgres (no `psql`)

From `apps/medusa-app`:

```bash
bun run test:db:prepare
```

This will:

1. Resolve `DATABASE_URL` (or build it from `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`; `$VAR` expansion is supported inside URL strings).
2. Create the target database if it does not exist (via `pg`, using `DATABASE_URL_MAINTENANCE` or `…/postgres` on the same host).
3. Run `medusa db:migrate` with the resolved `DATABASE_URL`.
4. Run `medusa exec ./src/scripts/seed.ts`.
5. Run `medusa user` for `USER_ACCOUNT` / `PASSWORD` when the admin is missing (duplicate errors are ignored).
6. Run `medusa exec ./src/scripts/ensure-test-customer.ts` for `CUSTOMER_ACCOUNT` / `PASSWORD`.

## Reset test database (drop + recreate)

Wipes the database named in `DATABASE_URL` (terminates other connections, `DROP DATABASE`, `CREATE DATABASE`). Refuses `postgres` / `template0` / `template1`. Stop Medusa (or anything using that DB) first if you prefer a clean shutdown.

```bash
bun run test:db:reset
bun run test:db:prepare
```

This is a full reset (empty DB), not a row-only `TRUNCATE`; `test:db:prepare` reapplies migrations and seed.

## Run Bun HTTP integration tests

1. Start Medusa with the same `.env.test` (e.g. `bun run test:dev`).
2. From `apps/medusa-app`:

```bash
bun run test:integration:bun
```

Integration tests call `MEDUSA_BACKEND_URL` (must match the server you started).

`package.json` passes **`--env-file=.env.test`** for `test:db:prepare`, `test:db:reset`, and `test:integration:bun`. See [Bun env files](https://bun.sh/docs/runtime/env).

`bunfig.toml` sets `test.root = "src"` and preloads `test/integration/preload.ts` (`loadEnv("test", …)`, MikroORM metadata cleared).

`test:integration:bun` uses **`--timeout 120000`**; the store cart integration test’s `beforeAll` also sets `{ timeout: 120_000 }`.

### Env used by prepare + Bun integration tests

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` or `DATABASE_USER` + `DATABASE_PASSWORD` + `DATABASE_NAME` | App database (prepare) |
| `DATABASE_URL_MAINTENANCE` | Optional; DB URL with rights to `CREATE DATABASE` |
| `USER_ACCOUNT` / `PASSWORD` | Admin (prepare + integration-test admin API) |
| `CUSTOMER_ACCOUNT` / `PASSWORD` | Storefront customer session test |
| `MEDUSA_BACKEND_URL` | Origin for Bun HTTP integration tests (`https://…` or `http://127.0.0.1:9000`) |

**HTTPS / self-signed:** for `https://` on `localhost`, `127.*`, or `*.local`, the harness uses `fetch` with `tls.rejectUnauthorized: false`. Set `TEST_TLS_INSECURE=0` or `1` to force behavior.

**Bootstrap (no manual ids):** admin login, `GET /admin/api-keys?type=publishable`, regions, sales channels, shipping profile, `POST /admin/products` for a disposable variant (deleted in `afterAll`).

Session flow: `POST /auth/customer/emailpass` → `POST /auth/session` → `connect.sid` + `x-publishable-api-key`.

The store cart integration test cleans up after itself: it runs `medusa exec ./src/scripts/delete-integration-test-carts.ts` (uses `DATABASE_URL` from `.env.test`) to remove carts it created, then deletes the disposable product via the Admin API. Re-run requires the same DB Medusa uses.
