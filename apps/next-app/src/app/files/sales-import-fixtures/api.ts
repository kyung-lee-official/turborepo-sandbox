import axios from "axios";

export type TestFixtureScenario = "perfect" | "partial" | "fail_fast";

export type GeneratedFixtureFile = {
  originalName: string;
  filepath: string;
  mimeType: string;
  worksheets?: string[];
  rowCount?: number;
  lineCount?: number;
};

export type ScenarioBundle = {
  scenario: TestFixtureScenario;
  bundleDir: string;
  expectedOutcome: "success" | "validation_failed" | "failed";
  uploadSlots: GeneratedFixtureFile[];
  generationTimeMs: number;
};

export type GenerateTestFixturesResponse = {
  success: true;
  bundles: ScenarioBundle[];
  totalTimeMs: number;
};

export const generateTestFixtures =
  async (): Promise<GenerateTestFixturesResponse> => {
    const res = await axios.post<GenerateTestFixturesResponse>(
      "/applications/sales-import-fixtures/generate-test-fixtures",
      {},
      {
        baseURL: process.env.NEXT_PUBLIC_NESTJS,
        headers: { "Content-Type": "application/json" },
        timeout: 20 * 60 * 1000,
      },
    );
    return res.data;
  };
