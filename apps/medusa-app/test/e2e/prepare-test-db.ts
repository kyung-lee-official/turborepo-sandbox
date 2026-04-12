/**
 * Chains: create test DB → migrate → seed → admin user (if missing) → ensure test customer.
 * Run from apps/medusa-app: `bun run test:db:prepare`
 */

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "@medusajs/framework/utils";
import { createTestDatabaseIfMissing } from "./create-test-database";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDUSA_APP_ROOT = path.resolve(__dirname, "..", "..");

const bunx = process.platform === "win32" ? "bunx.exe" : "bunx";

function runMedusaArgs(args: string[], env: NodeJS.ProcessEnv): void {
  execFileSync(bunx, ["medusa", ...args], {
    cwd: MEDUSA_APP_ROOT,
    env,
    stdio: "inherit",
  });
}

loadEnv("test", MEDUSA_APP_ROOT);

const databaseUrlTest = process.env.DATABASE_URL_TEST;
if (!databaseUrlTest) {
  throw new Error("DATABASE_URL_TEST is not set");
}

const userAccount = process.env.USER_ACCOUNT;
const password = process.env.PASSWORD;

const medusaEnv: NodeJS.ProcessEnv = {
  ...process.env,
  DATABASE_URL: databaseUrlTest,
};

await createTestDatabaseIfMissing();

console.info("[prepare-test-db] Running medusa db:migrate …");
runMedusaArgs(["db:migrate"], medusaEnv);

console.info("[prepare-test-db] Running seed …");
runMedusaArgs(["exec", "./src/scripts/seed.ts"], medusaEnv);

if (userAccount && password) {
  console.info("[prepare-test-db] Ensuring admin user …");
  try {
    execFileSync(bunx, ["medusa", "user", "-e", userAccount, "-p", password], {
      cwd: MEDUSA_APP_ROOT,
      env: medusaEnv,
      encoding: "utf-8",
      stdio: "pipe",
    });
    console.info("[prepare-test-db] Admin user created.");
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    const out = `${err.stderr ?? ""}${err.stdout ?? ""}`.toLowerCase();
    if (
      out.includes("already") ||
      out.includes("exists") ||
      out.includes("duplicate")
    ) {
      console.info("[prepare-test-db] Admin user already present; skipping.");
    } else {
      throw e;
    }
  }
} else {
  console.warn(
    "[prepare-test-db] USER_ACCOUNT or PASSWORD unset; skipping medusa user.",
  );
}

console.info("[prepare-test-db] Ensuring test customer …");
runMedusaArgs(["exec", "./src/scripts/ensure-test-customer.ts"], medusaEnv);

console.info("[prepare-test-db] Done.");
