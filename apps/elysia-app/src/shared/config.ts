/**
 * Port the Elysia API listens on.
 * `ELYSIA_PORT` avoids the shared `PORT` (Medusa binds 9000 in `.env.base`).
 */
export function serverPort(): number {
  const raw = process.env.ELYSIA_PORT ?? "3002";
  const port = Number.parseInt(raw, 10);
  if (!Number.isFinite(port) || port <= 0) return 3002;
  return port;
}
