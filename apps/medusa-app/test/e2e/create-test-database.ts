/**
 * Ensures the Postgres database from DATABASE_URL_TEST exists (no psql).
 * Run from apps/medusa-app: `bun ./test/e2e/create-test-database.ts`
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

function maintenanceConnectionString(
  testUrl: string,
  override?: string,
): string {
  if (override?.trim()) {
    return override.trim();
  }
  const u = new URL(testUrl);
  u.pathname = "/postgres";
  return u.toString();
}

export async function createTestDatabaseIfMissing(): Promise<void> {
  loadEnv(process.env.NODE_ENV ?? "test", MEDUSA_APP_ROOT);

  const testUrl = process.env.DATABASE_URL_TEST;
  if (!testUrl) {
    throw new Error("DATABASE_URL_TEST is not set");
  }

  const dbUrl = new URL(testUrl);
  const rawName = decodeURIComponent(dbUrl.pathname.replace(/^\//, ""));
  if (!rawName) {
    throw new Error(
      "DATABASE_URL_TEST must include a database name in the path",
    );
  }
  const dbName = assertSafeDbName(rawName);

  const maintenanceUrl = maintenanceConnectionString(
    testUrl,
    process.env.DATABASE_URL_TEST_MAINTENANCE,
  );

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
