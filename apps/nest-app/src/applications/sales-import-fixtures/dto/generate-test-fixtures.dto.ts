import { z } from "zod";

export const testFixtureScenarioSchema = z.enum([
  "perfect",
  "partial",
  "fail_fast",
]);

export type TestFixtureScenario = z.infer<typeof testFixtureScenarioSchema>;

export const generateTestFixturesBodySchema = z.object({
  scenarios: z.array(testFixtureScenarioSchema).optional(),
});

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

export type ScenarioBundle = {
  scenario: TestFixtureScenario;
  bundleDir: string;
  expectedOutcome: "success" | "validation_failed" | "failed";
  uploadSlots: GeneratedFixtureFile[];
  generationTimeMs: number;
};

export type GenerateTestFixturesResult = {
  success: true;
  bundles: ScenarioBundle[];
  totalTimeMs: number;
};
