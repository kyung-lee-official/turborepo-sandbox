import { z } from "zod";
import {
  VFR_TO_CFR_MAX_TARGET_FPS,
  VFR_TO_CFR_MIN_TARGET_FPS,
} from "./vfr-to-cfr.constants";

export const convertUploadedBodySchema = z.object({
  targetFps: z
    .number()
    .finite()
    .min(VFR_TO_CFR_MIN_TARGET_FPS)
    .max(VFR_TO_CFR_MAX_TARGET_FPS)
    .optional(),
  matchSourceAverage: z.boolean().optional(),
});

export type ConvertUploadedBody = z.infer<typeof convertUploadedBodySchema>;
