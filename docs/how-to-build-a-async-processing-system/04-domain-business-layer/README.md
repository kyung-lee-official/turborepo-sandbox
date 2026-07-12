# Layer 4: Domain Business Layer

The domain layer is where actual business work happens. It receives verified sources from the async-processing core, parses them with any needed plugins, validates business rules, persists valid data, emits domain progress, and returns a `DomainRunResult`.

## Boundary

```text
VerifiedProcessingSource map + DomainRunnerIo
  -> load source streams
  -> parse format
  -> validate business rules
  -> persist valid data
  -> collect non-critical errors
  -> DomainRunResult
```

The domain layer does not start jobs. It runs because the core selected its registered `DomainRunner`.

## Domain Registration

Domains register with `DomainRegistry`.

```ts
domainRegistry.register("invoice-import", {
  domainRunner: invoiceImportRunner,
  sourceSpecs: [
    { sourceId: "primaryData", required: true },
    { sourceId: "referenceData", required: true },
    { sourceId: "descriptions", required: false },
  ],
  lockPolicy: { type: "global_singleton" },
  upload: {
    allowedMimeBySourceId: {
      primaryData: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/octet-stream",
      ],
      descriptions: [
        "application/x-ndjson",
        "application/json",
        "application/octet-stream",
      ],
    },
  },
});
```

Registration is the domain's public contract:

- Which `sourceId` values are required.
- Whether concurrent jobs are allowed.
- Which upload MIME types are accepted.
- Which runner performs the business work.

## Domain Runner Contract

The core invokes a registered `DomainRunner` with `DomainRunnerIo`. The core owns `openStream` because the core owns verified locators. See [Appendix B](../appendix-b-shared-types/README.md).

## Domain Result

Return `DomainRunResult` with `success` or `validation_failed`. Use `validation_failed` for row-level or record-level non-critical errors where valid records were still processed. Throw only for critical failures that should mark the whole job as failed.

## Business Error Collection

Collect `ErrorDetail` values in memory during the domain run and return them with `validation_failed`. The worker persists them after the runner returns.

## Domain Progress

Domain progress uses `DomainProcessingPhase` values (`loading_source`, `validating_rows`, `saving_database`). See [Appendix B](../appendix-b-shared-types/README.md).

Use immediate progress for source loading and throttled progress for row validation or database writes.

Example progress payload:

```ts
{
  phase: "validating_rows",
  sourceId: "primaryData",
  originalName: "data.xlsx",
  totalCount: 10000,
  processedCount: 5200,
  validCount: 5100,
  errorCount: 100,
  percent: 52
}
```

## Using Plugins Inside the Domain

Format plugins are helpers, not orchestrators.

Typical XLSX flow:

1. Get `source = sources.get("primaryData")`.
2. `stream = await io.openStream(source)`.
3. Use the tabular XLSX plugin to load the workbook and parse sheet rows.
4. In `onRow`, apply business validation and persistence.
5. Scope parse and business errors with shared import utilities.
6. Return `success` or `validation_failed`.

Typical JSONL flow:

1. Get `source = sources.get("descriptions")`.
2. `stream = await io.openStream(source)`.
3. Use the JSONL plugin to parse line-delimited JSON.
4. In `onLine`, apply business validation and persistence.
5. Return collected errors if any.

## Persistence Strategy

The domain owns business persistence. It should:

- Persist valid rows even when invalid rows exist.
- Avoid wrapping the whole import in one transaction if partial success is required.
- Use per-row or per-batch transactions when appropriate.
- Make writes idempotent when jobs might be retried manually.

## Domain Invariants

- Domain code lives in a dedicated module per `domainKind`.
- Domain modules register with `DomainRegistry`.
- Domain code does not create processing jobs.
- Domain code does not acquire active locks.
- Domain code does not verify locators.
- Domain code does not delete upload locators.
- Domain code owns business schemas and rules.
- Domain code owns valid-data persistence.
- Domain returns structured errors, not error files.
