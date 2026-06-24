---
name: upload-local-multipart
description: >-
  Local disk upload via NestJS multipart proxy ingest. Use with
  start-processing-adapters for local proxy ingest before startProcessing.
---

# Upload — local multipart (proxy ingest)

## Goal

Client sends files to **NestJS** via **`multipart/form-data`**. Server writes bytes to **disk**, builds **`UploadSessionSources`**, then either saves **`UploadSession`** and returns **`{ uploadSessionId }`** (deferred) or emits **`processing.start-requested`** (autoStart). Stops before **`startProcessing`** — see [start-processing-adapters](../start-processing-adapters/SKILL.md). Job orchestration: [async-processing](../async-processing/SKILL.md).

**Upload progress:** Nest stream meter — not job SSE ([async-processing](../async-processing/SKILL.md) SSE).

**Input files are ephemeral:** worker **`deleteLocator`** removes local paths after processing ([async-processing — Worker](../async-processing/SKILL.md#worker)).

---

## Scope

| This skill owns | [start-processing-adapters](../start-processing-adapters/SKILL.md) owns |
| --- | --- |
| Multer, disk paths, rollback | **`UploadSession`** type + **`UploadSessionStore`** |
| Build **`UploadSessionSources`** | Start API, adapters, deferred trust model |
| **`LocalUploadSession`** form fields | `mapSessionSourcesToStartInput`, `POST .../start` |

Inject **`UploadSessionStore`** from start-processing-adapters — do not duplicate session persistence here.

---

## When to use

- Browser or API client POSTs multipart to Nest (proxy ingest).
- Small/medium files where server disk is acceptable.
- Optional **`autoStart`** — skip client start API and emit event after upload.

## Must not

- Call **`startProcessing`** from upload code — start adapters only.
- Write **`ProcessingJobRepository`** or acquire **`ProcessingActiveJobLock`** at upload time.
- **HEAD/stat** locators at upload — worker **verify** step in [async-processing](../async-processing/SKILL.md#worker).
- Accept client-supplied **`path`** or use **`originalName`** as the on-disk filename.
- Put file **buffers** on BullMQ or in Redis — persist to disk; adapters carry **`SourceLocator`** only.
- Return **`sources`** or **locators** to the client on **deferred** success — only **`uploadSessionId`** ([deferred start trust model](../start-processing-adapters/SKILL.md#deferred-start-trust-model)).

---

## Terminology

| Term | Meaning |
| ---- | ------- |
| **`LocalUploadSession`** | Per-request **form fields**: `domainKind`, `autoStart`, optional client `uploadSessionId` hint |
| **`UploadSession`** | Persisted record in session store — [start-processing-adapters](../start-processing-adapters/SKILL.md#session-source-types) |
| **`sourceId`** | Multipart **file** field name — must match domain **`sourceSpecs`** |
| **`UploadSessionSources`** | Built server-side — [start-processing-adapters](../start-processing-adapters/SKILL.md#session-source-types) |
| **`uploadSessionId`** | Folder name under upload base dir; returned to client; **not** `jobId` |

---

## Upload session

**`domainKind` is required** for every upload (form field or route param). Needed to resolve **`sourceSpecs`** and to save **`UploadSession`**.

```typescript
type LocalUploadSession = {
  domainKind: string;
  autoStart?: boolean; // default false
  uploadSessionId?: string; // optional client hint; server may generate nanoid()
};
```

| `autoStart` | On success |
| --- | --- |
| `false` (default) | **`UploadSessionStore.save`** → return `{ uploadSessionId }` only |
| `true` | Emit `{ domainKind, sources }` in-process → event adapter |

On **`global_singleton`** conflict during autoStart, event adapter **logs and skips** (no HTTP 409) — [start-processing-adapters — Event adapter](../start-processing-adapters/SKILL.md#event-adapter).

---

## Flow

Solid arrows: this skill. Dashed arrows: [start-processing-adapters](../start-processing-adapters/SKILL.md) adapters.

**Deferred start (`autoStart: false`):**

```mermaid
---
config:
  theme: neo-dark
---
flowchart LR
  multipart["POST multipart upload"]
  fail["fail cleanup disk"]
  ret["save UploadSession return uploadSessionId"]
  apiCtrl["API controller POST start"]
  apiAdp["API adapter"]
  boundary["startProcessing"]

  multipart -->|fail| fail
  multipart -->|success| ret
  ret -.-> apiCtrl
  apiCtrl -.-> apiAdp
  apiAdp -.-> boundary
```

**autoStart (`autoStart: true`):**

```mermaid
---
config:
  theme: neo-dark
---
flowchart LR
  multipart["POST multipart upload"]
  fail["fail cleanup disk"]
  emit["emit processing.start-requested"]
  eventSub["event subscriber"]
  eventAdp["event adapter"]
  boundary["startProcessing"]

  multipart -->|fail| fail
  multipart -->|success| emit
  emit -.-> eventSub
  eventSub -.-> eventAdp
  eventAdp -.-> boundary
```

---

## HTTP / Nest surface

Route: **`POST applications/async-processing/:domainKind/upload`**. Module: **`LocalMultipartUploadModule`** under **`import/upload/local-multipart/`**. **`AppModule`** imports it alongside **`AsyncProcessingModule`**.

```typescript
@Controller("applications/async-processing")
export class LocalMultipartUploadController {
  @Post(":domainKind/upload")
  @UseInterceptors(AnyFilesInterceptor(createLocalMultipartMulterOptions()))
  async upload(
    @Param("domainKind") domainKindFromRoute: string,
    @UploadedFiles() uploadedFiles: Express.Multer.File[] | undefined,
    @Body("autoStart") autoStartRaw: string | undefined,
    @Body("uploadSessionId") uploadSessionId: string | undefined,
    @Req() req: RequestWithSessionId,
  ) {
    const registration = this.domainRegistry.getByDomainKind(domainKindFromRoute);
    return this.localMultipartUploadService.handleUpload(
      groupUploadedFiles(uploadedFiles),
      { domainKind: domainKindFromRoute, autoStart: autoStartRaw === "true", uploadSessionId },
      registration,
      req,
    );
  }
}
```

- Resolve **`DomainKindRegistration`** (not just `sourceSpecs`) — includes optional **`upload`** MIME policy.
- File field names = **`sourceId`** values from registration.
- Form fields: **`autoStart`**, optional **`uploadSessionId`** hint.

### MIME validation

```typescript
// build-upload-session-sources.ts — uses registration.upload when present
buildUploadSessionSources(filesBySourceId, sourceSpecs, {
  allowedMimeBySourceId: registration.upload?.allowedMimeBySourceId,
  defaultAllowedMimeTypes: registration.upload?.defaultAllowedMimeTypes,
});
// default when domain omits upload policy: DEFAULT_TABULAR_XLSX_MIMES
```

Domains declare **`upload`** on **`DomainRegistry.register`** — see [async-processing — Domain registration](../async-processing/SKILL.md#module-layout).

---

## Disk persistence

Use Multer **`diskStorage`** (not memory + Redis buffer).

**Path rules**

1. Base: **`PROCESSING_UPLOAD_BASE_DIR`** or `{cwd}/temp/processing-uploads/`.
2. Per session: **`{base}/{uploadSessionId}/`** — folder uses **`uploadSessionId`**, not **`jobId`**.
3. Filename: **`{fieldname}-{nanoid}{ext}`** (Multer `diskStorage`).

```typescript
function buildSavedPath(sessionId: string, sourceId: string, mimeType: string): string {
  const ext = extensionFromMime(mimeType);
  return join(UPLOAD_BASE_DIR, sessionId, `${sourceId}-${nanoid()}${ext}`);
}
```

Set **`declaredSizeBytes`** from Multer **`file.size`** after write.

---

## Validation and `sourceSpecs`

1. Resolve **`sourceSpecs`** from **`DomainRegistry`** by **`session.domainKind`**.
2. For each **`SourceSpec`**: required → exactly one file; optional → zero or one.
3. Reject unknown file field names.
4. Validate MIME/size before persisting; on failure **rollback**.

---

```typescript
async handleUpload(files, session, registration: DomainKindRegistration, req) {
  const { sourceSpecs, upload: uploadPolicy } = registration;
  // validate fields vs sourceSpecs; build sources via buildUploadSessionSources(..., uploadPolicy)
  // deferred: uploadSessionStore.save; autoStart: emit PROCESSING_START_REQUESTED_EVENT
}
```

---

## Success paths

**Deferred (`autoStart: false`):**

```typescript
const uploadSessionId = session.uploadSessionId ?? nanoid();
await this.uploadSessionStore.save({
  uploadSessionId,
  domainKind: session.domainKind,
  sources,
  expiresAt: addHours(new Date(), 24),
});
return { uploadSessionId };
```

**`UploadSessionStore`** — [start-processing-adapters](../start-processing-adapters/SKILL.md#suggested-module-layout) module.

Client **`POST .../start`** with **`uploadSessionId`** only — [deferred start trust model](../start-processing-adapters/SKILL.md#deferred-start-trust-model).

**autoStart (`autoStart: true`):**

```typescript
this.eventEmitter.emit("processing.start-requested", {
  domainKind: session.domainKind,
  sources,
});
return { accepted: true }; // do not return locators to client
```

---

## Failure and rollback

On **any** error after one or more files were written:

1. **`unlink`** every path in `savedPaths: string[]`.
2. Do **not** emit event, save session, or return locators.
3. No **`ProcessingJob`** row, no BullMQ enqueue, no Redis active lock.

Run cheap validation before the first disk write when possible.

---

## Responsibilities

| Concern | This path |
| ------- | --------- |
| Multipart + **`diskStorage`** | yes |
| Server-generated **`path`** per **`sourceId`** | yes |
| Validate against **`sourceSpecs`** | yes |
| Save **`UploadSession`** via injected store (deferred) | yes |
| Return **`{ uploadSessionId }`** only on deferred success | yes |
| Emit **`processing.start-requested`** (autoStart) | yes |
| Implement **`UploadSessionStore`** | **no** — start-processing-adapters |
| Locator verify / job / lock / **`startProcessing`** | **no** |

---

## Suggested files

```text
import/upload/local-multipart/
  local-upload-session.types.ts
  local-multipart-upload.controller.ts
  local-multipart-upload.service.ts      # inject UploadSessionStore from start-processing-adapters
  multer-disk-storage.factory.ts
  build-upload-session-sources.ts
  rollback-saved-paths.ts

import/start-processing-adapters/
  upload-session.store.ts                # shared with S3/COS deferred start
```

**Do not** place upload code under **`applications/<domain>/`** — domains only register **`upload`** policy on **`DomainRegistry`**.

---

## Checklist

```text
- [ ] multipart/form-data: file fields = sourceIds; domainKind required (route or form)
- [ ] sourceSpecs from DomainRegistry per domainKind
- [ ] diskStorage — server paths only; rollback savedPaths on failure
- [ ] Deferred: UploadSessionStore.save → return { uploadSessionId } only (no locators)
- [ ] autoStart: emit processing.start-requested; minimal HTTP response (no locators)
- [ ] Never call startProcessing from upload code
- [ ] Document sourceId field names for the client
```

---

## Agent invocation

| Task | Skills |
| ---- | ------ |
| Multipart disk upload, autoStart | `upload-local-multipart` + `start-processing-adapters` |
| UploadSession store, start adapters | `start-processing-adapters` |
| Worker verify, job, lock, SSE | `async-processing` |
