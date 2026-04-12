/**
 * Ensures the Postgres database from DATABASE_URL exists (no psql).
 * Run from apps/medusa-app: `bun --env-file=.env.test ./test/e2e/create-test-database.ts`
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "@medusajs/framework/utils";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDUSA_APP_ROOT = path.resolve(__dirname, "..", "..");

function assertSafeDbName(name: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error(
      `Refusing to create database with unsafe name "${name}" (allowed: letters, digits, _, -)`,
    );
  }
  return name;
}

/** Expands `$VAR` placeholders using `process.env` (values URL-encoded for postgres URLs). */
function expandDollarEnvVars(template: string): string {
  return template.replace(/\$(\w+)/g, (_, name: string) => {
    const val = process.env[name];
    if (val === undefined || val === "") {
      throw new Error(
        `Cannot expand database URL: environment variable ${name} is unset`,
      );
    }
    return encodeURIComponent(val);
  });
}

/**
 * Resolved app database URL (same as Medusa uses from `.env.test`).
 */
export function resolveApplicationDatabaseUrl(): string {
  let url = process.env.DATABASE_URL?.trim();
  if (!url) {
    const user = process.env.DATABASE_USER;
    const pass = process.env.DATABASE_PASSWORD;
    const name = process.env.DATABASE_NAME;
    if (!user || pass === undefined || !name) {
      throw new Error(
        "Set DATABASE_URL or DATABASE_USER, DATABASE_PASSWORD, and DATABASE_NAME",
      );
    }
    const host = process.env.DATABASE_HOST ?? "localhost";
    const port = process.env.DATABASE_PORT ?? "5432";
    return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${name}`;
  }
  if (url.includes("$")) {
    url = expandDollarEnvVars(url);
  }
  return url;
}

export function resolveMaintenanceDatabaseUrl(appDatabaseUrl: string): string {
  let m = process.env.DATABASE_URL_MAINTENANCE?.trim();
  if (m) {
    if (m.includes("$")) {
      m = expandDollarEnvVars(m);
    }
    return m;
  }
  const u = new URL(appDatabaseUrl);
  u.pathname = "/postgres";
  return u.toString();
}

export async function createTestDatabaseIfMissing(): Promise<void> {
  loadEnv("test", MEDUSA_APP_ROOT);

  const testUrl = resolveApplicationDatabaseUrl();
  const dbUrl = new URL(testUrl);
  const rawName = decodeURIComponent(dbUrl.pathname.replace(/^\//, ""));
  if (!rawName) {
    throw new Error("DATABASE_URL must include a database name in the path");
  }
  const dbName = assertSafeDbName(rawName);

  const maintenanceUrl = resolveMaintenanceDatabaseUrl(testUrl);

  const client = new pg.Client({ connectionString: maintenanceUrl });
  await client.connect();

  try {
    const { rows } = await client.query<{ exists: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
      [dbName],
    );
    if (rows[0]?.exists) {
      console.info(
        `[create-test-database] Database "${dbName}" already exists.`,
      );
      return;
    }

    const quoted = `"${dbName.replace(/"/g, '""')}"`;
    await client.query(`CREATE DATABASE ${quoted}`);
  } finally {
    await client.end().catch(() => undefined);
  }

  console.info(`[create-test-database] Created database "${dbName}".`);
}

if (import.meta.main) {
  await createTestDatabaseIfMissing();
}
