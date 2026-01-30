import { z } from "zod";

export const updateAssessmentByIdSchema = z
  .object({
    memberId: z.string().toLowerCase(),
    id: z.string().toLowerCase(),
  })
  .required();

export type UpdateAssessmentByIdDto = z.infer<
  typeof updateAssessmentByIdSchema
>;
