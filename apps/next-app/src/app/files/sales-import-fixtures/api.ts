import { post } from "@/lib/fetcher";

export type ProductsSheetVariant =
  | "perfect"
  | "partially_available"
  | "fail_fast";

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

export type GenerateTestFixturesResponse = {
  success: true;
  bundle: FixtureBundle;
  totalTimeMs: number;
};

export const generateTestFixtures =
  async (): Promise<GenerateTestFixturesResponse> => {
    return post<GenerateTestFixturesResponse>(
      "/applications/sales-import-fixtures/generate-test-fixtures",
      {},
      {
        baseURL: process.env.NEXT_PUBLIC_NESTJS,
        headers: { "Content-Type": "application/json" },
        /* 20 minutes — fixture generation can be slow on large datasets */
        timeout: 20 * 60 * 1000,
      },
    );
  };
