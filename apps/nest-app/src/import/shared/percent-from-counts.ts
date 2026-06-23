export function percentFromCounts(
  processedCount: number,
  totalCount: number,
): number {
  if (totalCount <= 0) {
    return processedCount > 0 ? 100 : 0;
  }
  return Math.min(100, Math.round((processedCount / totalCount) * 100));
}
