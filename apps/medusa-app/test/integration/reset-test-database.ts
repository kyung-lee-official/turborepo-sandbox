/**
 * Hard-reset the Postgres database named in DATABASE_URL (drop + create empty DB).
 * Run from apps/medusa-app: `bun run test:db:reset`
 *
 * Then run `bun run test:db:prepare` to migrate, seed, and ensure users.
 */

import { dropAndRecreateTestDatabase } from "./create-test-database";

await dropAndRecreateTestDatabase();
console.info(
  "[reset-test-database] Next: bun run test:db:prepare (migrate, seed, users).",
);
