# @repo/database

Shared Prisma schema, migrations, and client used by **Elysia** (`@repo/database` import).

**Database:** `DATABASE_URL` in repo root `.env.base` (e.g. `turborepo-sandbox-elysia-app`).

## Layout

| Path | Purpose |
| --- | --- |
| `prisma/schema.prisma` | Data model |
| `prisma/migrations/` | Migration history |
| `prisma.config.ts` | Prisma CLI config (loads `DATABASE_URL` from repo root `.env.base`) |
| `src/generated/client/` | Generated client (after `bun run db:generate`) |
| `src/client.ts` | Shared `prisma` singleton |

## Environment

1. Copy `.env.base.example` → `.env.base` at the **repo root**
2. Set `DATABASE_URL` to the Elysia database (`turborepo-sandbox-elysia-app`)

Medusa uses **`MEDUSA_DATABASE_URL`** — see `apps/medusa-app` and root `db:medusa:*` scripts.

## Commands

From **repo root** (recommended):

```bash
bun run db:generate            # Prisma generate
bun run db:migrate:dev        # prisma migrate dev (interactive — new migrations)
bun run db:migrate:deploy    # apply migrations (first init / CI)
bun run db:studio            # Prisma Studio

bun run db:medusa:migrate         # medusa db:migrate (Medusa DB)
bun run db:medusa:seed            # seed Medusa DB
```

From **this package** (Elysia DB only):

```bash
bun run db:generate
bun run db:migrate:dev -- --name describe_your_change
```

## Consumers

- **elysia-app** — `import { prisma } from "@repo/database"`

## More

See `prisma/README.md` for migration precautions and data-model guidelines.