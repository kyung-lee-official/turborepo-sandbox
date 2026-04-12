import { execFileSync } from "node:child_process";
import path from "node:path";

const __dirname = path.dirname(__filename);

/** `apps/medusa-app` root (parent of `test/e2e`). */
export const MEDUSA_APP_ROOT = path.resolve(__dirname, "..", "..");

const bunx = process.platform === "win32" ? "bunx.exe" : "bunx";

/**
 * Runs `medusa exec <script>` from the Medusa app root with merged env (same pattern as prepare-test-db).
 */
export function medusaExec(
  scriptPathFromAppRoot: string,
  extraEnv: Record<string, string | undefined>,
): void {
  execFileSync(bunx, ["medusa", "exec", scriptPathFromAppRoot], {
    cwd: MEDUSA_APP_ROOT,
    env: { ...process.env, ...extraEnv },
    stdio: "pipe",
    encoding: "utf-8",
  });
}

/** Deletes carts by id via cart module (requires DATABASE_URL in env). */
export function deleteCartsByIdsViaMedusaExec(cartIds: string[]): void {
  const unique = [...new Set(cartIds.filter(Boolean))];
  if (unique.length === 0) {
    return;
  }
  medusaExec("./src/scripts/delete-e2e-carts.ts", {
    E2E_CART_IDS: unique.join(","),
  });
}
