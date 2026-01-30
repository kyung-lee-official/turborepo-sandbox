import { z } from "zod";

export const updateRoleSchema = z
  .object({
    id: z.string().toLowerCase(),
    members: z.array(z.string()),
  })
  .required();

export type UpdateRoleDto = z.infer<typeof updateRoleSchema>;
