import { Injectable, NotFoundException } from "@nestjs/common";
import type { DomainKindRegistration } from "./async-processing.types";

@Injectable()
export class DomainRegistry {
  private readonly registrations = new Map<string, DomainKindRegistration>();

  register(domainKind: string, registration: DomainKindRegistration): void {
    this.registrations.set(domainKind, registration);
  }

  getByDomainKind(domainKind: string): DomainKindRegistration {
    const registration = this.registrations.get(domainKind);
    if (!registration) {
      throw new NotFoundException(`Unknown domainKind: ${domainKind}`);
    }
    return registration;
  }
}
