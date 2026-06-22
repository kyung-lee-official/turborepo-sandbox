import type { ErrorDetail } from "./tabular-processing.types";

export type TabularErrorScope = {
  sourceId: string;
  originalName?: string;
  worksheetName?: string;
};

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
