import { z } from "zod";

export const testPipeSchema = z
  .object({
    name: z.string(),
    age: z.number(),
    email: z.string().email(),
  })
  .required();

export type TestPipeDto = z.infer<typeof testPipeSchema>;
