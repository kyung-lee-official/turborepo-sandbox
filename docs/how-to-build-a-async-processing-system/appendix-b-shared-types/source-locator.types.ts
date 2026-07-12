/**
 * Appendix B — shared locators for upload, adapters, manifest, and worker verification.
 */

export type SourceLocator =
  | { kind: "local"; path: string; declaredSizeBytes?: number }
  | {
      kind: "object";
      provider: "s3" | "cos";
      bucket: string;
      key: string;
      declaredSizeBytes?: number;
    };

export type VerifiedSourceLocator = SourceLocator & {
  sizeBytes: number;
  etag?: string;
};
