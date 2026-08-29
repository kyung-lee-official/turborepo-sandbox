import type { ErrorDetail } from "../../shared/import-error.types.ts";
import type { TabularErrorScope } from "./tabular-processing.types.ts";

export type { TabularErrorScope };

export function scopeTabularError(
  detail: ErrorDetail,
  scope: TabularErrorScope,
): ErrorDetail {
  return {
    ...detail,
    sourceId: detail.sourceId ?? scope.sourceId,
    originalName: detail.originalName ?? scope.originalName,
    worksheetName: detail.worksheetName ?? scope.worksheetName,
  };
}
