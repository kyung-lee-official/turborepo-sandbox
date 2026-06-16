# @repo/database

Shared Prisma schema, migrations, and client for **nest-app** (`@repo/database` import).

**Database:** `DATABASE_URL` in repo root `.env.base` (e.g. `turborepo-sandbox-nest-app`).

## Layout

| Path | Purpose |
| --- | --- |
| `prisma/schema.prisma` | Data model |
| `prisma/migrations/` | Migration history |
| `prisma.config.ts` | Prisma CLI config (loads `DATABASE_URL` from repo root `.env.base`) |
| `src/generated/client/` | Generated client (after `db:nest:generate`) |
| `src/client.ts` | Shared `prisma` singleton |

## Environment

1. Copy `.env.base.example` → `.env.base` at the **repo root**
2. Set `DATABASE_URL` to the Nest database (`turborepo-sandbox-nest-app`)

Medusa uses **`MEDUSA_DATABASE_URL`** — see `apps/medusa-app` and root `db:medusa:*` scripts.

## Commands

From **repo root** (recommended):

```bash
bun run db:nest:generate          # Prisma generate (Nest DB)
bun run db:nest:migrate:dev        # prisma migrate dev (Nest DB, interactive — new migrations)
bun run db:nest:migrate:deploy    # apply migrations (Nest DB, first init / CI)
bun run db:nest:studio            # Prisma Studio (Nest DB)

bun run db:medusa:migrate         # medusa db:migrate (Medusa DB)
bun run db:medusa:seed            # seed Medusa DB
```

From **this package** (Nest DB only):

```bash
bun run db:nest:generate
bun run db:nest:migrate:dev -- --name describe_your_change
```

## Consumers

- **nest-app** — `import { prisma } from "@repo/database"`
- **Do not** run `prisma` from `apps/nest-app` — there is no schema there.

## More

See `prisma/README.md` for migration precautions and data-model guidelines.
