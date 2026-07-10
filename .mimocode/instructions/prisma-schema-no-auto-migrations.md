# Prisma — schema and generate only (no migrations)

The database schema lives under the project's **`prisma/`** directory (`schema.prisma` + config). Run Prisma CLI from the package that owns the schema.

## Allowed (only these)

1. **Edit** `schema.prisma` (and related schema comments/models) when the task requires a data-model change.
2. **Run** `prisma generate` (e.g. `bunx prisma generate`) when the generated client must match the schema.

Nothing else under Prisma may be executed or authored by the agent.

## Strictly forbidden (always, no exceptions)

Do **not** run, suggest running on the user's machine as part of your work, or create/edit migration artifacts — **even if the user asks you to "fix drift", "add a migration", or "run migrate" in the same task**. Tell them to run migration commands themselves.

**Forbidden CLI commands** (any variant: `prisma`, `bunx prisma`, `bun run prisma`, etc.):

- `migrate dev`, `migrate deploy`, `migrate reset`, `migrate resolve`
- `migrate diff`, `migrate status` (when used to drive migration workflow)
- `db push`, `db pull` (when used to change or sync the database schema)
- Any command that creates, applies, or records migrations

**Forbidden files and directories:**

- Creating, editing, or deleting anything under **`prisma/migrations/`**
- Writing "catch-up" or drift-fix SQL for the user to apply as a migration

**Forbidden config changes for migration automation:**

- Do not add or change `shadowDatabaseUrl`, migration paths, or migration-related scripts solely to let an agent run `migrate diff` / `migrate dev`.

## After you change `schema.prisma`

1. Run **`prisma generate`** when TypeScript needs the updated client.
2. **Stop.** Do not migrate.
3. **Tell the user** they must create and apply migrations themselves, for example:

```bash
bunx prisma migrate dev --name describe_your_change
```

If the task only needs types/codegen, **`prisma generate`** alone is enough until the user adds a migration.
