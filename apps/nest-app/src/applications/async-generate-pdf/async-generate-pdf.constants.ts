import type { SourceSpec } from "@/async-processing/async-processing.types";

export const ASYNC_GENERATE_PDF_DOMAIN_KIND = "async-generate-pdf";

export const asyncGeneratePdfSourceSpecs: SourceSpec[] = [];

/** Brief pause after each progress tick so SSE stages stay visible in the demo UI. */
export const DEMO_STAGE_DELAY_MS = 300;
