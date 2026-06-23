import { z } from "zod";

export const productsSheetVariantSchema = z.enum([
  "perfect",
  "partially_available",
  "fail_fast",
]);

export type ProductsSheetVariant = z.infer<typeof productsSheetVariantSchema>;

export const generateTestFixturesBodySchema = z.object({});

export type GenerateTestFixturesBodyDto = z.infer<
  typeof generateTestFixturesBodySchema
>;

export type GeneratedFixtureFile = {
  originalName: string;
  filepath: string;
  mimeType: string;
  worksheets?: string[];
  rowCount?: number;
  lineCount?: number;
};

export type SalesDataFixtureFile = GeneratedFixtureFile & {
  productsVariant: ProductsSheetVariant;
  expectedOutcome: "success" | "validation_failed" | "failed";
};

export type FixtureBundle = {
  bundleDir: string;
  inventory: GeneratedFixtureFile;
  productDescriptions: GeneratedFixtureFile;
  salesDataVariants: SalesDataFixtureFile[];
  generationTimeMs: number;
};

export type GenerateTestFixturesResult = {
  success: true;
  bundle: FixtureBundle;
  totalTimeMs: number;
};
