# Support Layer: Import Plugins

Format plugins are not a trigger layer and not the async core. They are business-agnostic parsing helpers used inside domain runners ([Layer 4](../04-domain-business-layer/README.md)).

Plugins do not call `startProcessing`. They do not know `domainKind`. They do not persist jobs.

Cross-format utilities live in [import-shared.md](./import-shared.md). XLSX and JSONL plugins are documented separately and do not depend on each other.

## Where This Fits

```text
async processing core (Layer 3)
  -> calls DomainRunner (Layer 4)
    -> domain opens verified source stream
      -> domain calls format plugin (this layer)
        -> plugin parses format and reports parse progress/errors
      -> domain uses import/shared helpers for errors and domain progress
      -> domain applies business rules and persistence
```

## Child Guides

| Guide                                  | Role                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------- |
| [import-shared.md](./import-shared.md) | `ErrorDetail`, domain progress helpers, NDJSON/XLSX error export        |
| [xlsx.md](./xlsx.md)                   | Tabular XLSX plugin — ExcelJS, headers, `cell.text`, `parsing_workbook` |
| [jsonl.md](./jsonl.md)                 | JSONL plugin — line parse, `parsing_lines`, line-level errors           |

Types: [Appendix B: Shared Types](../appendix-b-shared-types/05-import-plugin-support-layer/) (plugin + shared types).

## Module Layout

```text
import/
  shared/                       # see import-shared.md
  plugins/
    tabular-xlsx/               # see xlsx.md
    jsonl/                      # see jsonl.md
```

Do not add barrel `index.ts` files that hide which plugin or helper a caller imports.

## Plugin Invariants (all formats)

- Plugins receive streams, buffers, workbook objects, specs, and callbacks.
- Plugins do not open locators — the domain calls `io.openStream` first.
- Plugins do not verify locators, upload sessions, BullMQ, or `domainKind`.
- Plugins do not persist business data.
- Plugins import `ErrorDetail` from `import/shared` — see [import-shared.md](./import-shared.md).
- A domain may use XLSX only, JSONL only, or both — merging `errors[]` is a domain choice.
