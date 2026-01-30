import type { ApiBodyOptions } from "@nestjs/swagger";

export const createDecimalApiBody: ApiBodyOptions = {
  schema: {
    type: "object",
    properties: {
      decimal: {
        oneOf: [{ type: "number" }, { type: "string" }],
        description:
          "Decimal value (flexible precision) - accepts both number and string",
        example: 123.456789,
      },
      rate: {
        oneOf: [{ type: "number" }, { type: "string" }],
        description:
          "Rate with precision 10, scale 6 (up to 9999.999999) - accepts both number and string",
        example: 15.25,
      },
      monetary: {
        oneOf: [{ type: "number" }, { type: "string" }],
        description:
          "Monetary value with precision 10, scale 2 (up to 99999999.99) - accepts both number and string",
        example: 1299.99,
      },
    },
    required: ["decimal", "rate", "monetary"],
  },
  examples: {
    "Number values": {
      value: {
        decimal: 123.456789,
        rate: 0.1255,
        monetary: 1299.99,
      },
    },
    "String values": {
      value: {
        decimal: "123.456789",
        rate: "0.125500",
        monetary: "1299.99",
      },
    },
    "Mixed types": {
      value: {
        decimal: 999.999,
        rate: "99.999999",
        monetary: 50000.0,
      },
    },
    "High precision string": {
      value: {
        decimal: "0.123456789012345",
        rate: "0.000001",
        monetary: "0.01",
      },
    },
  },
};
