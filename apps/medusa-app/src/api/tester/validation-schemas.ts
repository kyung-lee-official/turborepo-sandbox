import { z } from "@medusajs/framework/zod";

export const testerSchema = z.object({
  first_name: z.string().min(2).max(100),
  last_name: z.string().min(2).max(100),
  email: z.string().email(),
  avatar_url: z.string().url().optional(),
});
