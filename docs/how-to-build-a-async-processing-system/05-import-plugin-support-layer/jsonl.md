# JSONL Plugin

Business-agnostic JSONL / NDJSON import for any async `sourceId`. The domain `DomainRunner` implements business rules in `onLine`.

Does not depend on the [XLSX plugin](./xlsx.md). Shared utilities: [import-shared.md](./import-shared.md).

Types: [Appendix B — jsonl-plugin.types.ts](../appendix-b-shared-types/05-import-plugin-support-layer/jsonl-plugin.types.ts).

## Boundary

```text
Readable from domain (io.openStream)
  -> split lines, JSON.parse per line
  -> onLine callbacks + parse-time ErrorDetail
  -> parsing_lines progress
```

## Scope

| This plugin owns                                     | Domain runner owns                                                                      |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Read `Readable`, split lines, `JSON.parse` per line  | `io.openStream(source)` per `VerifiedProcessingSource`                                  |
| Parse-time `ErrorDetail` (bad JSON, non-object line) | Business rules in `onLine`                                                              |
| Trim top-level string fields once before `onLine`    | `validating_rows`, `saving_database` ([Layer 4](../04-domain-business-layer/README.md)) |
| `parsing_lines` progress                             | `DomainRunResult` with `errors: ErrorDetail[]`                                          |

### Must not

- BullMQ, Redis, `domainKind`, Prisma, or job APIs.
- `io.openStream` or locator verification.
- `buildValidationErrorXlsxBuffer` or error download formatting.
- Hardcoded domain field names or business schemas.
- Define `ErrorDetail` — import from [import-shared.md](./import-shared.md).
- Import the XLSX plugin.

## When to Use

- Any async job that ingests `.jsonl` or `application/x-ndjson` `sourceId` values.
- Alone or alongside XLSX — the domain merges `errors[]` if both are used.

## Types

```typescript
type JsonlPluginPhase = "parsing_lines";

type JsonlProcessingProgress = {
  phase: JsonlPluginPhase;
  sourceId: string;
  originalName?: string;
  percent?: number;
};

type JsonlParseContext = { sourceId: string; label?: string };
```

JSONL errors **omit `worksheetName`**. `rowNumber` is the **1-based physical line** in the file.

## Parse Behavior

| Input                         | Behavior                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------- |
| Empty or whitespace-only line | Skip — no `onLine`, no `pushError`                                           |
| Invalid JSON                  | `pushError` — `rowNumber`, `rawData` = line text (outer trim only)           |
| JSON parses to non-object     | `pushError` — one object per line required; `{}` is valid                    |
| Valid object line             | Trim top-level string values once; pass `record` to `onLine`                 |
| Line endings                  | Split on `\n`; strip trailing `\r` (CRLF) via readline `crlfDelay`           |
| UTF-8                         | Strip BOM on first line only when present                                    |
| `rowNumber`                   | 1-based physical line — blank lines still increment the counter              |
| Progress                      | Optional `onProgress(percent)` — emit `100` at EOF when lines were processed |

## Plugin API

```typescript
async function parseJsonlLines(
  stream: Readable,
  ctx: JsonlParseContext,
  handlers: {
    onLine: (line: {
      rowNumber: number;
      record: Record<string, unknown>;
    }) => void | Promise<void>;
    onProgress?: (percent: number) => Promise<void>;
    pushError: (detail: ErrorDetail) => void;
  },
): Promise<void>;

function scopeJsonlError(
  detail: ErrorDetail,
  scope: { sourceId: string; originalName?: string },
): ErrorDetail;

async function reportJsonlProgress(
  onProgress: ((detail: unknown) => Promise<void>) | undefined,
  phase: JsonlPluginPhase,
  sourceId: string,
  options?: { originalName?: string; percent?: number },
): Promise<void>;
```

`parseJsonlLines` applies `scopeJsonlError` for parse-time errors. The domain appends business `ErrorDetail` in `onLine`.

## Implementation pattern: scope errors

```typescript
function scopeJsonlError(
  detail: ErrorDetail,
  scope: { sourceId: string; originalName?: string },
): ErrorDetail {
  return {
    ...detail,
    sourceId: detail.sourceId ?? scope.sourceId,
    originalName: detail.originalName ?? scope.originalName,
  };
}
```

## Implementation pattern: `parseJsonlLines` (outline)

```typescript
async function parseJsonlLines(stream, ctx, handlers) {
  const scope = { sourceId: ctx.sourceId, originalName: ctx.label };
  let rowNumber = 0;
  let processedNonBlankLines = 0;

  const lineReader = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const rawLine of lineReader) {
    rowNumber++;
    const line = stripLeadingBom(rawLine, rowNumber === 1);
    if (line.trim().length === 0) continue;

    const rawData = line.trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawData);
    } catch {
      handlers.pushError(
        scopeJsonlError(
          { message: "Invalid JSON on line", rowNumber, rawData },
          scope,
        ),
      );
      processedNonBlankLines++;
      continue;
    }

    if (!isPlainObject(parsed)) {
      handlers.pushError(
        scopeJsonlError(
          { message: "Line must be a JSON object", rowNumber, rawData },
          scope,
        ),
      );
      processedNonBlankLines++;
      continue;
    }

    const record = trimTopLevelStrings(parsed);
    await handlers.onLine({ rowNumber, record });
    processedNonBlankLines++;
  }

  if (handlers.onProgress && processedNonBlankLines > 0) {
    await handlers.onProgress(100);
  }
}
```

## Implementation pattern: JSONL progress

```typescript
async function reportJsonlProgress(onProgress, phase, sourceId, options) {
  if (!onProgress) return;
  await onProgress({
    phase,
    sourceId,
    originalName: options?.originalName,
    percent: options?.percent,
  });
}
```

## Domain Integration

The domain opens the stream; the plugin receives `Readable` only.

```typescript
const stream = await io.openStream(source);
const errors: ErrorDetail[] = [];

await parseJsonlLines(
  stream,
  { sourceId: source.sourceId, label: source.label },
  {
    pushError: (detail) => errors.push(detail),
    onProgress: async (percent) => {
      await reportJsonlProgress(
        io.onProgress,
        "parsing_lines",
        source.sourceId,
        { originalName: source.label, percent },
      );
    },
    onLine: async ({ rowNumber, record }) => {
      const message = validateRecord(record);
      if (message) {
        errors.push(
          scopeJsonlError(
            { message, rowNumber, rawData: JSON.stringify(record) },
            { sourceId: source.sourceId, originalName: source.label },
          ),
        );
      }
      // persist valid records
    },
  },
);
```

Terminal `DomainRunResult` and domain progress: [import-shared.md](./import-shared.md), [Layer 4](../04-domain-business-layer/README.md).

## Progress Phases

| Phase                                                  | Who emits                               | Helper                                 |
| ------------------------------------------------------ | --------------------------------------- | -------------------------------------- |
| `parsing_lines`                                        | This plugin (domain wraps `onProgress`) | `reportJsonlProgress`                  |
| `loading_source`, `validating_rows`, `saving_database` | Domain runner                           | [import-shared.md](./import-shared.md) |

A single job may interleave `TabularProcessingProgress`, `JsonlProcessingProgress`, and `DomainProcessingProgress` — clients discriminate on `phase`.

## Module Layout

```text
import/plugins/jsonl/
  jsonl-processing.types.ts
  parse-jsonl-lines.ts
  scope-jsonl-errors.ts
  report-jsonl-progress.ts
```

No `index.ts` barrel re-exports.

## Invariants

- Domain opens `io.openStream`; plugin receives `Readable` only.
- `ErrorDetail` from import/shared — see [import-shared.md](./import-shared.md).
- Blank lines skipped; invalid JSON and non-object lines become scoped errors.
- Plugin emits `parsing_lines` only.
- Do not set `worksheetName` on JSONL errors.

## Checklist

```text
- [ ] Domain opens io.openStream; plugin receives Readable only
- [ ] ErrorDetail from import/shared — see import-shared.md
- [ ] Blank lines skipped; invalid JSON / non-object → scoped ErrorDetail
- [ ] Plugin emits parsing_lines only; domain emits validating_rows / saving_database
- [ ] No index.ts barrel re-exports
- [ ] No import from xlsx plugin
```

## See Also

- [import-shared.md](./import-shared.md) — shared errors and domain progress
- [xlsx.md](./xlsx.md) — peer format plugin (optional in same domain)
- [Layer 4](../04-domain-business-layer/README.md) — domain runner and persistence
