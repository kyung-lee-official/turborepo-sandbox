# Support Layer: Import Plugins and Shared Import Utilities

The import plugins are not a trigger layer and not the async core. They are business-agnostic parsing helpers used inside domain runners.

The shared import utilities define common error and progress types that plugins, domains, and the async core can agree on.

Related skills:

- `.cursor/skills/import-plugin-tabular-xlsx/SKILL.md`
- `.cursor/skills/import-plugin-jsonl/SKILL.md`
- `.cursor/skills/import-shared/SKILL.md`

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

## Import Shared

`import-shared` is the common vocabulary for imports.

It owns:

- `ErrorDetail`
- Domain progress types and helpers
- Throttled progress helper
- Optional validation error XLSX export
- Processing job error NDJSON builder
- Common exported sheet formatting helpers

Recommended location:

```text
apps/nest-app/src/import/shared/
  import-error.types.ts
  domain-processing.types.ts
  report-domain-progress.ts
  create-throttled-domain-progress.ts
  percent-from-counts.ts
  build-validation-error-xlsx.ts
  build-processing-job-errors-jsonl.ts
  apply-exported-sheet-view.ts
```

`import-shared` is cross-format. It should not contain XLSX-only or JSONL-only parser behavior.

## Tabular XLSX Plugin

Related skill: `import-plugin-tabular-xlsx`

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

The domain supplies:

```ts
type TabularSheetSpec = {
  sheetName: string;
  headers: readonly string[];
};
```

The domain receives rows and decides what they mean.

## JSONL Plugin

Related skill: `import-plugin-jsonl`

The JSONL plugin owns line-delimited JSON parsing. It is business-agnostic.

It owns:

- Reading a `Readable`.
- Splitting lines.
- Handling CRLF and UTF-8 BOM.
- Skipping blank lines.
- `JSON.parse` per line.
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

## Plugin Progress vs Domain Progress

| Progress phase | Emitted by | Meaning |
| --- | --- | --- |
| `parsing_workbook` | XLSX plugin | Workbook/sheet parsing progress |
| `parsing_lines` | JSONL plugin | JSONL line parsing progress |
| `loading_source` | Domain | Domain is preparing a source |
| `validating_rows` | Domain | Domain business validation progress |
| `saving_database` | Domain | Domain persistence progress |

Clients should discriminate progress events by `phase`.

## Error Responsibilities

| Error type | Owner |
| --- | --- |
| Bad XLSX sheet/header/cell shape | XLSX plugin, scoped with shared `ErrorDetail` |
| Bad JSONL syntax/non-object line | JSONL plugin, scoped with shared `ErrorDetail` |
| Business rule failure | Domain runner |
| Persisting errors to DB | Async-processing worker after domain returns |
| Downloading persisted job errors | Async-processing controller |
| Optional XLSX export of errors | `import-shared` utility, called by an API or domain-specific export path |

## Recommended Module Layout

```text
apps/nest-app/src/import/
  shared/
  plugins/
    tabular-xlsx/
    jsonl/
```

Avoid barrel `index.ts` exports in these plugin folders. Import concrete files so dependencies stay obvious.

## Plugin Invariants

- Plugins receive streams, buffers, workbook objects, specs, and callbacks.
- Plugins do not open locators themselves.
- Plugins do not verify locators.
- Plugins do not know upload sessions.
- Plugins do not know BullMQ.
- Plugins do not know `domainKind`.
- Plugins do not persist business data.
- Plugins create parse errors; domains create business errors.
- Shared import types live in `import/shared`, not inside one plugin.
