import { createHash } from "node:crypto";

export type AsyncGeneratePdfLineItem = {
  sku: string;
  description: string;
  quantity: number;
  unitPrice: string;
};

export type AsyncGeneratePdfInfoRow = {
  name: string;
  email: string;
  age: number;
  gender: string;
  invoiceDate: string;
  lineItems: AsyncGeneratePdfLineItem[];
  auditEntries: string[];
};

export type AsyncGeneratePdfInfoSummaryRow = {
  name: string;
  email: string;
  age: number;
  gender: string;
  invoiceDate: string;
  lineItemCount: number;
  auditEntryCount: number;
};

export const MOCK_INVOICE_COUNT = 1000;

/** Large line-item tables make each pdfkit document costly to lay out. */
export const LINE_ITEMS_PER_INVOICE = 200;

/** Extra appendix text blocks per invoice, also part of the mock payload. */
export const AUDIT_ENTRIES_PER_INVOICE = 100;

const FIRST_NAMES = [
  "Ada",
  "Grace",
  "Alan",
  "Katherine",
  "Tim",
  "Dennis",
  "Barbara",
  "Donald",
  "Margaret",
  "Ken",
  "Radia",
  "Linus",
  "Shafi",
  "Edsger",
  "Frances",
  "John",
  "Yann",
  "Brendan",
  "Guido",
  "Sophie",
  "James",
  "Leslie",
  "Martin",
  "Evelyn",
  "Claude",
  "Vint",
  "Robert",
  "Elaine",
  "Michael",
  "Susan",
] as const;

const LAST_NAMES = [
  "Lovelace",
  "Hopper",
  "Turing",
  "Johnson",
  "Berners-Lee",
  "Ritchie",
  "Liskov",
  "Knuth",
  "Hamilton",
  "Thompson",
  "Perlman",
  "Torvalds",
  "Goldwasser",
  "Dijkstra",
  "Allen",
  "McCarthy",
  "LeCun",
  "Eich",
  "van Rossum",
  "Wilson",
  "Gosling",
  "Lamport",
  "Fowler",
  "Boyd",
  "Shannon",
  "Ceruzzi",
  "Metcalfe",
  "Rich",
  "Stonebraker",
  "Wing",
] as const;

const GENDERS = ["Female", "Male", "Non-binary"] as const;

const SERVICE_CATEGORIES = [
  "Platform subscription",
  "Support retainer",
  "API usage overage",
  "Data export service",
  "Training workshop",
  "Security audit",
  "Storage expansion",
  "Integration setup",
  "Consulting hours",
  "License renewal",
  "Migration assistance",
  "Monitoring package",
  "Disaster recovery drill",
  "Compliance review",
  "Performance tuning",
  "Custom reporting",
  "On-call coverage",
  "Sandbox environment",
  "Identity federation",
  "Log retention",
] as const;

function invoiceDateFromIndex(index: number): string {
  const month = String((index % 12) + 1).padStart(2, "0");
  const day = String((index % 27) + 1).padStart(2, "0");
  return `2026-${month}-${day}`;
}

function buildMockInfoIdentity(
  index: number,
): Pick<
  AsyncGeneratePdfInfoRow,
  "name" | "email" | "age" | "gender" | "invoiceDate"
> {
  const serial = index + 1;
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName =
    LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];

  return {
    name: `${firstName} ${lastName} ${serial}`,
    email: `invoice-${String(serial).padStart(4, "0")}@example.com`,
    age: 28 + ((index * 3) % 35),
    gender: GENDERS[index % GENDERS.length],
    invoiceDate: invoiceDateFromIndex(index),
  };
}

function buildLineItemDescription(
  category: string,
  personIndex: number,
  itemIndex: number,
): string {
  return [
    category,
    `billing window ${personIndex + 1}-${itemIndex + 1}.`,
    "Includes provisioning, usage reconciliation, entitlement checks, and monthly statement generation.",
    "Support response targets follow the enterprise SLA unless a separate rider applies.",
    "Any overage is calculated from telemetry captured in the primary control region.",
  ].join(" ");
}

function buildAuditEntry(personIndex: number, entryIndex: number): string {
  const digest = createHash("sha256")
    .update(`audit:${personIndex}:${entryIndex}`)
    .digest("hex");
  return [
    `Audit trail ${entryIndex + 1} checksum ${digest}.`,
    "Reviewer notes cover invoice matching, tax jurisdiction validation, and approval routing.",
    "Retain this appendix with the signed customer statement for the billing period.",
  ].join(" ");
}

function buildLineItems(personIndex: number): AsyncGeneratePdfLineItem[] {
  return Array.from({ length: LINE_ITEMS_PER_INVOICE }, (_, itemIndex) => {
    const category =
      SERVICE_CATEGORIES[(personIndex + itemIndex) % SERVICE_CATEGORIES.length];
    const quantity = ((personIndex + itemIndex) % 7) + 1;
    const unitAmount = 18 + ((personIndex * 11 + itemIndex * 5) % 240);

    return {
      sku: `SKU-${String(personIndex + 1).padStart(4, "0")}-${String(itemIndex + 1).padStart(3, "0")}`,
      description: buildLineItemDescription(category, personIndex, itemIndex),
      quantity,
      unitPrice: unitAmount.toFixed(2),
    };
  });
}

function buildAuditEntries(personIndex: number): string[] {
  return Array.from({ length: AUDIT_ENTRIES_PER_INVOICE }, (_, entryIndex) =>
    buildAuditEntry(personIndex, entryIndex),
  );
}

export function buildMockInfoSummaryRow(
  index: number,
): AsyncGeneratePdfInfoSummaryRow {
  return {
    ...buildMockInfoIdentity(index),
    lineItemCount: LINE_ITEMS_PER_INVOICE,
    auditEntryCount: AUDIT_ENTRIES_PER_INVOICE,
  };
}

export function buildMockInfoRow(index: number): AsyncGeneratePdfInfoRow {
  return {
    ...buildMockInfoIdentity(index),
    lineItems: buildLineItems(index),
    auditEntries: buildAuditEntries(index),
  };
}

export function listMockInfoSummaryRows(): AsyncGeneratePdfInfoSummaryRow[] {
  return Array.from({ length: MOCK_INVOICE_COUNT }, (_, index) =>
    buildMockInfoSummaryRow(index),
  );
}
