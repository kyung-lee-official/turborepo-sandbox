export type JobPhase = "queued" | "processing" | "complete" | "failed";

export type JobOutcome = "success" | "validation_failed" | "failed";

export type ImportUpload = {
  uploadSlotId: string;
  originalName: string;
  buffer: Buffer;
  mimeType?: string;
};

export type UploadSlotSpec = {
  uploadSlotId: string;
  required: boolean;
};

export type JobMeta = {
  jobId: string;
  importKind: string;
  phase: JobPhase;
  progress?: unknown;
  outcome?: JobOutcome;
  errorBlobKey?: string;
  importedCount?: number;
  errorCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type DomainImportResult =
  | { outcome: "success"; importedCount: number; errorCount: 0 }
  | {
      outcome: "validation_failed";
      importedCount: number;
      errorCount: number;
      errorBlob?: Buffer;
    };

export type DomainImportRunner = {
  importKind: string;
  run(
    uploads: Map<string, ImportUpload>,
    hooks: {
      onProgress: (detail: unknown) => Promise<void>;
    },
  ): Promise<DomainImportResult>;
};

export type ImportLockPolicy =
  | { type: "none" }
  | { type: "global_singleton" };

export type ImportKindRegistration = {
  domainRunner: DomainImportRunner;
  uploadSlots: UploadSlotSpec[];
  lockPolicy: ImportLockPolicy;
};

export type AsyncImportJobPayload = {
  jobId: string;
  importKind: string;
};

export const ASYNC_IMPORT_QUEUE = "async-import" as const;

export const ASYNC_IMPORT_LOCK_CODE = "IMPORT_ALREADY_RUNNING" as const;
