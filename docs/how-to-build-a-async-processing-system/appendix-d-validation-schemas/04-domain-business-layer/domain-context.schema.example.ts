/**
 * Appendix D — Layer 4: Example domain context schema.
 *
 * Each domainKind defines its own Zod schema for io.context from the manifest.
 * Copy this file per domain and replace fields with domain-specific parameters.
 */

import { z } from "zod";

export const invoiceImportContextSchema = z.object({
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/, "yearMonth must be YYYY-MM"),
  timezone: z.string().min(1).optional(),
  startedAtTimestamp: z.number().int().positive().optional(),
});

export type InvoiceImportContext = z.infer<typeof invoiceImportContextSchema>;

/**
 * Usage at the start of DomainRunner.run:
 *
 * const context = invoiceImportContextSchema.parse(io.context ?? {});
 */
