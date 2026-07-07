export type AsyncGeneratePdfProgressPhase =
  | "generating_pdf"
  | "saving_pdf"
  | "zipping_pdfs"
  | "removing_folder";

export type AsyncGeneratePdfProgress = {
  phase: AsyncGeneratePdfProgressPhase;
  email?: string;
  detail?: string;
  processedCount: number;
  totalCount: number;
  percent: number;
};
