import { status } from "elysia";
import type { DomainKindRegistration } from "./types.ts";

export class DomainRegistry {
  private readonly registrations = new Map<string, DomainKindRegistration>();

  register(domainKind: string, registration: DomainKindRegistration): void {
    this.registrations.set(domainKind, registration);
  }

  getByDomainKind(domainKind: string): DomainKindRegistration {
    const registration = this.registrations.get(domainKind);
    if (!registration) {
      throw status(404, { error: `Unknown domainKind: ${domainKind}` });
    }
    return registration;
  }

  has(domainKind: string): boolean {
    return this.registrations.has(domainKind);
  }

  list(): string[] {
    return Array.from(this.registrations.keys());
  }
}

export const domainRegistry = new DomainRegistry();
