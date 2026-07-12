# Layer 1: Optional Upload Layer

The upload layer is not part of the core async-processing system. It is documented here because many processing flows start with file uploads.

Its job is simple: accept bytes, store them somewhere controlled by the server, and produce server-generated locators that a later adapter can use.

## Boundary

```text
client file bytes
  -> upload endpoint or direct object-store upload
  -> server-generated local/object locators
  -> UploadSession or trusted in-process start event
```

The upload layer stops before `startProcessing`.

## Local Multipart Upload

Use local multipart upload when a browser or API client posts files to NestJS with `multipart/form-data`.

The server should:

- Resolve `domainKind` from the route or form field.
- Resolve the domain registration from `DomainRegistry`.
- Treat multipart file field names as `sourceId` values.
- Validate required and optional files against `sourceSpecs`.
- Validate MIME types against the domain upload policy.
- Store files on local disk using server-generated paths.
- Build `UploadSessionSources`.
- Either save an `UploadSession` for deferred start or emit `processing.start-requested` for auto-start.

Recommended route shape:

```text
POST /app/async-processing/:domainKind/upload
```

Recommended local storage shape:

```text
{PROCESSING_UPLOAD_BASE_DIR}/{uploadSessionId}/{sourceId}-{nanoid}.{ext}
```

The upload folder uses `uploadSessionId`, not `jobId`, because the upload layer does not create jobs.

## Deferred vs Auto-Start

| Mode | Upload success behavior | Next step |
| --- | --- | --- |
| Deferred | Save `UploadSession`, return `{ uploadSessionId }` only | Client calls `POST /app/async-processing/start` |
| Auto-start | Emit `processing.start-requested` with trusted in-process sources | Event adapter calls `startProcessing` |

Deferred is the default and safest model. The client never receives locators.

## Upload Session Shape

The upload layer does not need to know job internals. It builds and stores session data:

```ts
type UploadSession = {
  uploadSessionId: string;
  domainKind: string;
  sources: UploadSessionSources;
  expiresAt: Date;
  context?: Record<string, unknown>;
};

type UploadSessionSources = Record<string, {
  sourceId: string;
  originalName: string;
  mimeType?: string;
  locator: SourceLocator;
}>;
```

`context` contains non-file form fields such as `yearMonth` or `timezone`. It must not contain file locators supplied by the client.

## Local Locator

```ts
type SourceLocator = {
  kind: "local";
  path: string;
  declaredSizeBytes?: number;
};
```

The upload layer sets `declaredSizeBytes` from Multer metadata. The async worker verifies the file later with `stat`.

## Failure and Rollback

If any upload step fails after files were written:

1. Delete all saved local files for that request.
2. Do not save an `UploadSession`.
3. Do not emit a start event.
4. Do not create a processing job.
5. Do not acquire a processing lock.

This keeps failed uploads from leaking into the async system.

## Future Stub: Amazon S3 Direct Upload

Target model:

1. `POST /app/:domainKind/upload/s3/initiate`
2. Server validates `sourceId` and MIME policy.
3. Server generates S3 object keys and presigned PUT URLs.
4. Client uploads directly to S3.
5. `POST /app/:domainKind/upload/s3/complete`
6. Server saves `UploadSession` with object locators.
7. Client calls `POST /app/async-processing/start` with `uploadSessionId`.

Complete must not call `HeadObject`. The worker verifies object locators later.

## Future Stub: Tencent COS Direct Upload

Target model:

1. `POST /app/:domainKind/upload/cos/initiate`
2. Server validates `sourceId` and MIME policy.
3. Server generates COS keys.
4. Server issues scoped STS credentials for only the session prefix.
5. Client uploads directly to COS.
6. `POST /app/:domainKind/upload/cos/complete`
7. Server saves `UploadSession` with COS object locators.
8. Client calls `POST /app/async-processing/start` with `uploadSessionId`.

Implement this as a dedicated flow. Do not bolt object-store completion onto unrelated upload endpoints.

## Upload Layer Invariants

- Server owns `path`, `bucket`, and `key`.
- Client only receives `uploadSessionId` in deferred mode.
- Upload does not call `startProcessing` directly.
- Upload does not write `ProcessingJob`.
- Upload does not acquire `ProcessingActiveJobLock`.
- Upload does not put file buffers in Redis or BullMQ.
- Upload progress is separate from async job progress.
- Worker cleanup deletes local/object locators after processing.
