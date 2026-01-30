import { z } from "zod";

export const CreateDecimalSchema = z.object({
  decimal: z
    .union([
      z.number(),
      z
        .string()
        .regex(/^-?\d+(\.\d+)?$/, "decimal must be a valid decimal number"),
    ])
    .describe("Decimal value (flexible precision)"),

  rate: z
    .union([
      z.number().min(-9999.999999).max(9999.999999),
      z
        .string()
        .regex(
          /^-?\d{1,4}(\.\d{1,6})?$/,
          "rate must be a valid decimal with max 4 digits before decimal and 6 after (precision 10, scale 6)",
        ),
    ])
    .describe("Rate with precision 10, scale 6 (up to 9999.999999)"),

  monetary: z
    .union([
      z.number().min(-99999999.99).max(99999999.99),
      z
        .string()
        .regex(
          /^-?\d{1,8}(\.\d{1,2})?$/,
          "monetary must be a valid decimal with max 8 digits before decimal and 2 after (precision 10, scale 2)",
        ),
    ])
    .describe("Monetary value with precision 10, scale 2 (up to 99999999.99)"),
});

export type CreateDecimalDto = z.infer<typeof CreateDecimalSchema>;
