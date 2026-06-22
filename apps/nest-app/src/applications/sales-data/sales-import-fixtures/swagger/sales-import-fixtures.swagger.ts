import type { ApiBodyOptions, ApiOperationOptions } from "@nestjs/swagger";

export const generateTestFixturesApiOperation: ApiOperationOptions = {
  summary: "Generate sales-import test fixture bundles",
  description:
    "Generate three skill-aligned fixture bundles (perfect, partial, fail_fast). Each bundle contains salesData.xlsx, inventory.xlsx, and productDescriptions.jsonl under nest-app/temp.",
};

export const generateTestFixturesApiBody: ApiBodyOptions = {
  description: "Optional scenario filter",
  required: false,
  schema: {
    type: "object",
    properties: {
      scenarios: {
        type: "array",
        items: {
          type: "string",
          enum: ["perfect", "partial", "fail_fast"],
        },
      },
    },
  },
};
