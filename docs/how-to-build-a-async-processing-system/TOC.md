# How to Build an Async Processing System

## Table of Contents

1. [System Overview](./README.md)
2. [Layer 1: Optional Upload Layer](./01-optional-upload-layer/README.md)
3. [Layer 2: Start Processing Adapter Layer](./02-start-processing-adapter-layer/README.md)
4. [Layer 3: Async Processing Core Layer](./03-async-processing-core-layer/README.md)
5. [Layer 4: Domain Business Layer](./04-domain-business-layer/README.md)
6. [Support Layer: Import Plugins and Shared Import Utilities](./05-import-plugin-support-layer/README.md)

## Part II — Reference Appendices

A. [Prisma Data Model](./appendix-a-prisma-data-model/README.md)
B. [Shared Types](./appendix-b-shared-types/README.md)

## Main Control Flow

```text
optional upload layer
  -> start processing adapter layer
    -> async processing core layer
      -> domain business layer
        -> optional import plugin support layer
```

The upload layer is optional and decoupled. The actual async-processing system begins at the adapter boundary that calls `startProcessing`.
