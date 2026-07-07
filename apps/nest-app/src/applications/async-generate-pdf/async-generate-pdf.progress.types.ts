export type AsyncGeneratePdfProgressPhase = "generating_pdf" | "saving_pdf";

export type AsyncGeneratePdfProgress = {
  phase: AsyncGeneratePdfProgressPhase;
  email: string;
  processedCount: number;
  totalCount: number;
  percent: number;
};
