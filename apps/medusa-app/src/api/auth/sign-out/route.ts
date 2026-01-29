import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  /* clear the medusa_token cookie */
  res
    .setHeader("Set-Cookie", [
      `medusa_token=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=None; Domain=${process.env.COOKIE_DOMAIN}`,
    ])
    .status(200)
    .json({ message: "Signed out successfully." });
}
