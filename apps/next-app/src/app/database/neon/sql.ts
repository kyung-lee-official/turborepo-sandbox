/**
 * Idempotent DDL for the single test table. Running it repeatedly is safe and
 * never alters an existing table.
 */
export const CREATE_NEON_RANDOM_NUMBER_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS "neon_random_number" (
  "id" INTEGER PRIMARY KEY,
  "value" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
)
`;

/** Keeps exactly one row (`id = 1`) and returns it. */
export const UPSERT_NEON_RANDOM_NUMBER_SQL = `
INSERT INTO "neon_random_number" ("id", "value", "updatedAt")
VALUES (1, $1, NOW())
ON CONFLICT ("id") DO UPDATE
SET "value" = EXCLUDED."value", "updatedAt" = NOW()
RETURNING "id", "value", "updatedAt"
`;
