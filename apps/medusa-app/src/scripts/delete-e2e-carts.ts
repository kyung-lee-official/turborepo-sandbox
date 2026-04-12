import type { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * Deletes carts listed in E2E_CART_IDS (comma-separated). Used by Bun HTTP E2E cleanup.
 */
export default async function deleteE2eCarts({ container }: ExecArgs) {
  const raw = process.env.E2E_CART_IDS?.trim();
  if (!raw) {
    return;
  }
  const ids = [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    ),
  ];
  if (ids.length === 0) {
    return;
  }

  const cartModule = container.resolve(Modules.CART);
  for (const id of ids) {
    await cartModule.deleteCarts(id);
  }
}
