import { z } from "zod";

export const createRoleSchema = z
  .object({
    id: z.string().toLowerCase(),
  })
  .required();

export type CreateRoleDto = z.infer<typeof createRoleSchema>;
