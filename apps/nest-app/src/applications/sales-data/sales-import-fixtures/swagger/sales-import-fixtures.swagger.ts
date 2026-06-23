import type { ApiBodyOptions, ApiOperationOptions } from "@nestjs/swagger";

export const generateTestFixturesApiOperation: ApiOperationOptions = {
  summary: "Generate sales-import test fixture bundle",
  description:
    "Generate one fixture bundle under nest-app/temp with perfect inventory.xlsx, perfect productDescriptions.jsonl, and three salesData workbooks that differ only on the Products sheet (perfect, partially_available, fail_fast). LineItems is always perfect.",
};

export const generateTestFixturesApiBody: ApiBodyOptions = {
  description: "No request body fields",
  required: false,
  schema: {
    type: "object",
    additionalProperties: false,
  },
};
