import type { ErrorDetail } from "../tabular-xlsx/tabular-processing.types";
import type { JsonlErrorScope } from "./jsonl-processing.types";

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
