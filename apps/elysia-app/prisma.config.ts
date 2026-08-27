import { defineConfig } from "prisma/config";

/**
 * Prisma CLI datasource for `apps/elysia-app`.
 * `DATABASE_URL` is loaded by the package.json `prisma*` scripts via
 * `bun --env-file=../../.env.base [--env-file=../../.env.<env>]`.
 */
function databaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "Set DATABASE_URL for Prisma. Run the prisma scripts via `bun run prisma*` from apps/elysia-app (they load .env.base / .env.<env>).",
    );
  }
  return url;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl(),
  },
});
