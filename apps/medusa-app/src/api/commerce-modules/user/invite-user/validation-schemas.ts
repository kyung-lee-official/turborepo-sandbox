import { z } from "@medusajs/framework/zod";

export const inviteSchema = z.object({
  email: z.string().email(),
});
