# Meilisearch Integration

This module provides full-text search capabilities for products using Meilisearch.

## Overview

The Meilisearch integration consists of:

1. **Module Service** - Core service for Meilisearch operations
2. **Workflows** - Orchestrate product synchronization
3. **Subscriber** - Listen for sync events
4. **API Routes** - Trigger sync and search products

## Setup

### 1. Environment Variables

Add to `.env`:

```
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your-api-key
MEILISEARCH_PRODUCT_INDEX_NAME=products
```

### 2. Configuration

The module is already registered in `medusa-config.ts`:

```typescript
{
  resolve: "./src/modules/meilisearch",
  options: {
    host: process.env.MEILISEARCH_HOST,
    apiKey: process.env.MEILISEARCH_API_KEY,
    productIndexName: process.env.MEILISEARCH_PRODUCT_INDEX_NAME,
  },
}
```

## Usage

### Sync Products to Meilisearch

Trigger a full synchronization of products from database to Meilisearch:

```bash
POST /admin/meilisearch/sync
```

Response:

```json
{
  "message": "Product synchronization to Meilisearch has been initiated",
  "status": "pending"
}
```

The sync runs asynchronously in batches of 50 products. Only published products are indexed.

### Search Products

Search the indexed products:

```bash
POST /store/products/search
```

Request body:

```json
{
  "query": "laptop",
  "limit": 20,
  "offset": 0,
  "filter": []
}
```

Response:

```json
{
  "query": "laptop",
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 150
  },
  "hits": [
    {
      "id": "product-1",
      "title": "Gaming Laptop",
      "handle": "gaming-laptop",
      ...
    }
  ],
  "processingTimeMs": 45
}
```

## Implementation Details

### Workflow: `sync-products-to-meilisearch`

Orchestrates the entire synchronization process:

1. Queries database for products with relevant fields
2. Splits products by publication status
3. Indexes published products
4. Removes unpublished products from index
5. Includes rollback (compensation) logic on failure

### Steps

**syncProductsToMeilisearchStep** - Indexes published products with rollback capability

**deleteProductsFromMeilisearchStep** - Removes unpublished products with rollback capability

### Subscriber: `meilisearch-sync`

Listens to `"meilisearch.sync"` event and:

- Retrieves all products from database in batches of 50
- Calls the sync workflow for each batch
- Logs completion status

## Architecture Benefits

- **Async Processing** - Sync runs in background, HTTP response returns immediately
- **Error Handling** - Failed operations are logged with context
- **Scalability** - Batch processing prevents memory overload
- **Security** - API key kept server-side, search endpoint requires proxying through Medusa
- **Observability** - Logging at each step for debugging

## Indexed Product Fields

Products are indexed with these fields:

- `id` - Product ID
- `title` - Product title
- `description` - Product description
- `handle` - URL-friendly handle
- `thumbnail` - Thumbnail image URL
- `categories` - Array of category objects (id, name, handle)
- `tags` - Array of tag objects (id, value)
- `status` - Publication status

## Troubleshooting

### Meilisearch Connection Error

```
Error: Could not reach Meilisearch
```

Ensure Meilisearch server is running and `MEILISEARCH_HOST` is correct.

### Index Not Found

```
Error: Index not found
```

Products need to be synced first. Call `POST /admin/meilisearch/sync`.

### Search Returns Empty Results

1. Verify products are published (status = "published")
2. Check sync completed successfully
3. Verify search query matches indexed content

## File Structure

```
src/
├── modules/meilisearch/
│   ├── index.ts           # Module definition
│   └── service.ts         # Core service with search logic
├── workflows/
│   ├── sync-products-to-meilisearch.ts  # Main workflow
│   └── steps/
│       ├── sync-products-to-meilisearch.ts
│       └── delete-products-from-meilisearch.ts
├── subscribers/
│   └── meilisearch-sync.ts  # Event handler
└── api/
    ├── admin/meilisearch/sync/route.ts     # Trigger sync endpoint
    └── store/products/search/route.ts      # Product search endpoint
```
