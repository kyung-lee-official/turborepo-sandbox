# Layer 2: Start Processing Adapter Layer

The adapter layer is the trigger boundary for async processing. It converts trusted server-side upload/session/event data into `StartProcessingInput`, then calls `ProcessingOrchestratorService.startProcessing`.

## Boundary

```text
UploadSession or trusted in-process event
  -> adapter validation and normalization
  -> StartProcessingInput
  -> startProcessing
```

Only adapters call `startProcessing`.

## What This Layer Owns

- `UploadSessionStore`
- Session-backed deferred start API
- Event-backed auto-start subscriber
- Validation of raw API or event input
- Mapping `UploadSessionSources` to `StartProcessingInput`
- HTTP `202` success and `409` active-job-conflict mapping

## What This Layer Must Not Own

- Multipart parsing or object-store upload mechanics
- Local disk paths or object-store key generation
- Job repository implementation
- BullMQ queue logic
- Worker source verification
- Business validation or parsing

## Canonical Input to the Core

Adapters output `StartProcessingInput` with `ProcessingSource` entries mapped from `UploadSessionSources`. See [Appendix B: Shared Types](../appendix-b-shared-types/README.md).

## Deferred Start API

Recommended request:

```http
POST /app/async-processing/start
Content-Type: application/json

{ "uploadSessionId": "sess_abc", "domainKind": "invoice-import" }
```

The body must be strict:

- Accept `uploadSessionId`.
- Optionally accept `domainKind` for verification.
- Reject client-supplied `sources`.
- Reject client-supplied `context`.
- Load canonical `sources` and `context` from `UploadSessionStore`.

On success:

```http
202 Accepted

{ "jobId": "...", "manifestId": "..." }
```

On active global singleton conflict:

```http
409 Conflict

{
  "code": "PROCESSING_ACTIVE_JOB",
  "message": "A processing job is already active for domainKind invoice-import"
}
```

## Session Lifecycle

| Step | Behavior |
| --- | --- |
| Upload success | Save pending `UploadSession` |
| `POST /app/async-processing/start` | Load session by `uploadSessionId` |
| `startProcessing` succeeds | Consume session, or store started ids for idempotent replay |
| `startProcessing` fails | Keep session so the client can retry |
| Session expired or missing | Return `404` |

Recommended policy: consume the session after successful start. If clients need retry-after-lost-response behavior, use `startedJobId` and `startedManifestId` idempotency instead.

Session TTL and event names: [Appendix C: Constants and Redis Keys](../appendix-c-constants/README.md).

## Event Auto-Start

Auto-start is an in-process path. The upload layer emits `processing.start-requested` with a `ProcessingStartRequestedPayload` (see [Appendix B](../appendix-b-shared-types/README.md)). The event subscriber forwards the payload to an event adapter. The event adapter validates and maps it, then calls `startProcessing`.

If `ActiveJobConflictError` occurs in auto-start mode, the default behavior is to log a warning and skip. There is no HTTP client to receive a `409`.

## Mapping Rule

```ts
function mapUploadSessionToStartInput(session: UploadSession): StartProcessingInput {
  return {
    domainKind: session.domainKind,
    context: session.context,
    sources: Object.fromEntries(
      Object.entries(session.sources).map(([key, entry]) => {
        if (key !== entry.sourceId) {
          // Reject request — map keys must match entry.sourceId
          throw new Error(`sourceId mismatch: ${key} vs ${entry.sourceId}`);
        }

        return [
          key,
          {
            sourceId: entry.sourceId,
            label: entry.originalName,
            mimeType: entry.mimeType,
            locator: entry.locator,
          },
        ];
      }),
    ),
  };
}
```

## Adapter Invariants

- Controllers and subscribers stay thin.
- API and event adapters are the only callers of `startProcessing`.
- Deferred start trusts only server-stored sessions.
- API start consumes a session only after successful `startProcessing`.
- API conflicts map to `409`.
- Event conflicts log and skip by default.
- Adapters do not duplicate domain `sourceSpecs`; the orchestrator validates required sources.
