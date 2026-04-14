import type { MedusaRequest } from "@medusajs/framework";

type HeaderMap = MedusaRequest["headers"];

/**
 * Best-effort client IP for `billing_ip` (OceanPayment fraud / risk).
 * Prefer `X-Forwarded-For` first hop when behind a reverse proxy.
 */
export function getForwardedClientIp(headers: HeaderMap): string | undefined {
  const xf = headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length > 0) {
    const first = xf.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  if (Array.isArray(xf) && xf.length > 0) {
    const first = xf[0]?.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  const realIp = headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) {
    return realIp.trim();
  }
  return undefined;
}
