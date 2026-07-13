# How to Build an Async Processing System

## Table of Contents

1. [System Overview](./README.md)
2. [Layer 1: Optional Upload Layer](./01-optional-upload-layer/README.md)
3. [Layer 2: Start Processing Adapter Layer](./02-start-processing-adapter-layer/README.md)
4. [Layer 3: Async Processing Core Layer](./03-async-processing-core-layer/README.md)
5. [Layer 4: Domain Business Layer](./04-domain-business-layer/README.md)
6. [Support Layer: Import Plugins](./05-import-plugin-support-layer/README.md)
   - [Import shared utilities](./05-import-plugin-support-layer/import-shared.md)
   - [XLSX plugin](./05-import-plugin-support-layer/xlsx.md)
   - [JSONL plugin](./05-import-plugin-support-layer/jsonl.md)

## Part II — Reference Appendices

A. [Prisma Data Model](./appendix-a-prisma-data-model/README.md)
B. [Shared Types](./appendix-b-shared-types/README.md)
C. [Constants and Redis Keys](./appendix-c-constants/README.md)
D. [Validation Schemas](./appendix-d-validation-schemas/README.md)

## HTTP API (book convention)

All illustrative routes use the `/app/async-processing` prefix. See [Appendix C — HTTP Routes](./appendix-c-constants/README.md#http-routes-reference).

## Main Control Flow

```text
optional upload layer
  -> start processing adapter layer
    -> async processing core layer
      -> domain business layer
        -> optional import plugin support layer
```

The upload layer is optional and decoupled. The actual async-processing system begins at the adapter boundary that calls `startProcessing`.
