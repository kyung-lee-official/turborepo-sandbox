import { ConflictException } from "@nestjs/common";
import type { ImportJobStoreService } from "./import-job-store.service";
import {
  ASYNC_IMPORT_LOCK_CODE,
  type ImportLockPolicy,
} from "./async-import.types";

export async function assertImportLockAllowsEnqueue(
  importKind: string,
  lockPolicy: ImportLockPolicy,
  jobStore: ImportJobStoreService,
): Promise<void> {
  switch (lockPolicy.type) {
    case "none":
      return;
    case "global_singleton": {
      const activeJobId = await jobStore.getActiveJobIdByImportKind(importKind);
      if (activeJobId) {
        throw new ConflictException({
          code: ASYNC_IMPORT_LOCK_CODE,
          message: `An import job is already active for importKind ${importKind}`,
          activeJobId,
        });
      }
      return;
    }
    default: {
      const _exhaustive: never = lockPolicy;
      return _exhaustive;
    }
  }
}
