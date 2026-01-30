import { z } from "zod";

export const getAssessmentByIdSchema = z
  .object({
    principalName: z.string().toLowerCase(),
    assessmentId: z.string().toLowerCase(),
  })
  .required();

export type GetAssessmentByIdDto = z.infer<typeof getAssessmentByIdSchema>;
