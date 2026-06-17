import { Injectable, Logger } from "@nestjs/common";
import type { ImportKindRegistration } from "./async-import.types";

@Injectable()
export class ImportRegistry {
  private readonly logger = new Logger(ImportRegistry.name);
  private readonly registrations = new Map<string, ImportKindRegistration>();

  register(importKind: string, registration: ImportKindRegistration) {
    if (this.registrations.has(importKind)) {
      this.logger.warn(`Overwriting registration for importKind ${importKind}`);
    }
    this.registrations.set(importKind, registration);
  }

  getByImportKind(importKind: string): ImportKindRegistration {
    const registration = this.registrations.get(importKind);
    if (!registration) {
      throw new Error(`Unknown importKind: ${importKind}`);
    }
    return registration;
  }
}
