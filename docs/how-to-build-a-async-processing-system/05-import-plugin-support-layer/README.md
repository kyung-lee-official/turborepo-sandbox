# Support Layer: Import Plugins and Shared Import Utilities

The import plugins are not a trigger layer and not the async core. They are business-agnostic parsing helpers used inside domain runners.

The shared import utilities define common error and progress types that plugins, domains, and the async core can agree on.

`ErrorDetail`, domain progress, and plugin progress types: [Appendix B: Shared Types](../appendix-b-shared-types/README.md).

## Where This Fits

```text
async processing core
  -> calls DomainRunner
    -> domain opens verified source stream
      -> domain calls format plugin
        -> plugin parses format and reports parse progress/errors
      -> domain applies business rules and persistence
```

Plugins do not call `startProcessing`. Plugins do not know `domainKind`. Plugins do not persist jobs.

## Shared Import Utilities

Shared import utilities are the common vocabulary for imports.

They own:

- `ErrorDetail`
- Domain progress types and helpers
- Throttled progress helper
- Optional validation error XLSX export
- Processing job error NDJSON builder
- Common exported sheet formatting helpers

Keep shared utilities cross-format. They should not contain XLSX-only or JSONL-only parser behavior.

Typical responsibilities to split into small modules:

| Module concern           | Examples                                                |
| ------------------------ | ------------------------------------------------------- |
| Error and progress types | `ErrorDetail`, domain progress payloads                 |
| Progress helpers         | throttled callbacks, percent-from-counts                |
| Error export             | validation error XLSX builder, job error NDJSON builder |
| Sheet export defaults    | freeze header row, enable auto-filter on export sheets  |

## Tabular XLSX Plugin

The tabular XLSX plugin owns workbook and worksheet parsing. It is business-agnostic.

It owns:

- ExcelJS workbook loading from buffer or stream.
- Header validation against a domain-supplied `TabularSheetSpec`.
- Reading `cell.text` and trimming values.
- Mapping rows to `{ rowNumber, cells }`.
- Parse-time `ErrorDetail` creation.
- `parsing_workbook` progress.

It does not own:

- Domain-specific sheet names or columns.
- Business validation.
- Database writes.
- BullMQ, Redis, jobs, manifests, locks, or SSE.
- Error XLSX export.

The domain supplies `TabularSheetSpec` per sheet (see [Appendix B](../appendix-b-shared-types/README.md)). The domain receives rows and decides what they mean.

## JSONL Plugin

The JSONL plugin owns line-delimited JSON parsing. It is business-agnostic.

It owns:

- Reading a `Readable`.
- Splitting lines.
- Handling CRLF and UTF-8 BOM.
- Skipping blank lines.
- Parsing one JSON value per line.
- Rejecting non-object lines.
- Trimming top-level string values.
- Parse-time `ErrorDetail` creation.
- `parsing_lines` progress.

It does not own:

- Domain schemas.
- Business validation.
- Database writes.
- Job lifecycle.
- Error download API.

For JSONL, `rowNumber` means the 1-based physical line number.

Progress phases for plugins and domains are listed in [Appendix B](../appendix-b-shared-types/README.md). Clients should discriminate progress events by `phase`.

## Error Responsibilities

| Error type                       | Owner                                                                    |
| -------------------------------- | ------------------------------------------------------------------------ |
| Bad XLSX sheet/header/cell shape | XLSX plugin, scoped with shared `ErrorDetail`                            |
| Bad JSONL syntax/non-object line | JSONL plugin, scoped with shared `ErrorDetail`                           |
| Business rule failure            | Domain runner                                                            |
| Persisting errors to DB          | Async-processing worker after domain returns                             |
| Downloading persisted job errors | `ProcessingController`                                                   |
| Optional XLSX export of errors   | Shared import utilities, called by an API or domain-specific export path |

## Recommended Module Layout

Organize import code into three areas:

```text
import/
  shared/          # cross-format types and helpers
  plugins/
    tabular-xlsx/  # XLSX parsing only
    jsonl/         # JSONL parsing only
```

Avoid re-export barrels that hide which plugin or helper a caller depends on.

## Plugin Invariants

- Plugins receive streams, buffers, workbook objects, specs, and callbacks.
- Plugins do not open locators themselves.
- Plugins do not verify locators.
- Plugins do not know upload sessions.
- Plugins do not know BullMQ.
- Plugins do not know `domainKind`.
- Plugins do not persist business data.
- Plugins create parse errors; domains create business errors.
- Shared import types live in shared utilities, not inside one plugin.
