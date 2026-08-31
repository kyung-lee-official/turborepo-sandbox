/** Port the Elysia API listens on. `ELYSIA_PORT` avoids the shared `PORT` (Medusa binds 9000 in `.env.base`). */
export function serverPort(): number {
  const raw = process.env.ELYSIA_PORT ?? "3001";
  const port = Number.parseInt(raw, 10);
  if (!Number.isFinite(port) || port <= 0) return 3001;
  return port;
}

/** Postgres connection string for this app (`turborepo-sandbox-elysia-app`). */
export function databaseUrl(): string {
  return process.env.DATABASE_URL?.trim() ?? "";
}

export function requireDatabaseUrl(): string {
  const url = databaseUrl();
  if (!url) {
    throw new Error(
      "Missing DATABASE_URL (e.g. postgresql://…/turborepo-sandbox-elysia-app).",
    );
  }
  return url;
}
