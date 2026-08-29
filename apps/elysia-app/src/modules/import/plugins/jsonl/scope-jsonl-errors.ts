import type { ErrorDetail } from "../../shared/import-error.types.ts";
import type { JsonlErrorScope } from "./jsonl-processing.types.ts";

export function scopeJsonlError(
  detail: ErrorDetail,
  scope: JsonlErrorScope,
): ErrorDetail {
  return {
    ...detail,
    sourceId: detail.sourceId ?? scope.sourceId,
    originalName: detail.originalName ?? scope.originalName,
  };
}
