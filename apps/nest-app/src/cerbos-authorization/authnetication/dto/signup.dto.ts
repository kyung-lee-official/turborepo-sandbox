import { z } from "zod";

export const signUpSchema = z
  .object({
    id: z.string().toLowerCase(),
  })
  .required();

export type SignUpDto = z.infer<typeof signUpSchema>;
