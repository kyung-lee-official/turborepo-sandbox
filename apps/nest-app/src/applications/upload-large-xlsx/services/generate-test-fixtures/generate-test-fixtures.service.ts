import { Injectable, Logger } from "@nestjs/common";
import { existsSync, mkdirSync } from "node:fs";
import { appendFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  GenerateTestFixturesBodyDto,
  GenerateTestFixturesResult,
  ScenarioBundle,
  TestFixtureScenario,
} from "../../dto/generate-test-fixtures.dto";
import { buildInventoryWorkbook } from "./helpers/build-inventory-workbook";
import { buildProductDescriptionsJsonl } from "./helpers/build-product-descriptions-jsonl";
import { buildSalesDataWorkbook } from "./helpers/build-sales-data-workbook";
import {
  FIXTURE_FILE_NAMES,
  MIME_TYPES,
  SALES_IMPORT_KIND,
  UPLOAD_SLOT,
} from "./helpers/sales-fixture.constants";
import { buildSkuPool } from "./helpers/sku-pool";

const ALL_SCENARIOS: TestFixtureScenario[] = [
  "perfect",
  "partial",
  "fail_fast",
];

@Injectable()
export class GenerateTestFixturesService {
  private readonly logger = new Logger(GenerateTestFixturesService.name);

  async generate(
    body: GenerateTestFixturesBodyDto,
  ): Promise<GenerateTestFixturesResult> {
    const startTime = Date.now();
    const scenarios = body.scenarios?.length ? body.scenarios : ALL_SCENARIOS;

    await this.ensureTempInGitignore();

    const bundles: ScenarioBundle[] = [];
    for (const scenario of scenarios) {
      this.logger.log(`Generating ${scenario} fixture bundle...`);
      bundles.push(await this.generateBundle(scenario));
    }

    return {
      success: true,
      bundles,
      totalTimeMs: Date.now() - startTime,
    };
  }

  private async generateBundle(
    scenario: TestFixtureScenario,
  ): Promise<ScenarioBundle> {
    const bundleStart = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const bundleDir = join(
      process.cwd(),
      "temp",
      `sales-import-${scenario}-${timestamp}`,
    );
    mkdirSync(bundleDir, { recursive: true });

    const pool = buildSkuPool();

    const salesDataPath = join(bundleDir, FIXTURE_FILE_NAMES.salesData);
    const salesData = await buildSalesDataWorkbook({
      filepath: salesDataPath,
      scenario,
      pool,
      includeLineItemsSheet: scenario !== "fail_fast",
    });

    const inventoryPath = join(bundleDir, FIXTURE_FILE_NAMES.inventory);
    const inventory = await buildInventoryWorkbook({
      filepath: inventoryPath,
      scenario,
      pool,
    });

    const jsonlPath = join(bundleDir, FIXTURE_FILE_NAMES.productDescriptions);
    const jsonl = await buildProductDescriptionsJsonl({
      filepath: jsonlPath,
      scenario,
      pool,
    });

    const expectedOutcome =
      scenario === "perfect"
        ? "success"
        : scenario === "partial"
          ? "validation_failed"
          : "failed";

    return {
      scenario,
      importKind: SALES_IMPORT_KIND,
      bundleDir,
      expectedOutcome,
      uploadSlots: [
        {
          uploadSlotId: UPLOAD_SLOT.salesData,
          originalName: FIXTURE_FILE_NAMES.salesData,
          filepath: salesDataPath,
          mimeType: MIME_TYPES.xlsx,
          worksheets: salesData.worksheets,
          rowCount: salesData.rowCount,
        },
        {
          uploadSlotId: UPLOAD_SLOT.inventory,
          originalName: FIXTURE_FILE_NAMES.inventory,
          filepath: inventoryPath,
          mimeType: MIME_TYPES.xlsx,
          worksheets: inventory.worksheets,
          rowCount: inventory.rowCount,
        },
        {
          uploadSlotId: UPLOAD_SLOT.productDescriptions,
          originalName: FIXTURE_FILE_NAMES.productDescriptions,
          filepath: jsonlPath,
          mimeType: MIME_TYPES.jsonl,
          lineCount: jsonl.lineCount,
        },
      ],
      generationTimeMs: Date.now() - bundleStart,
    };
  }

  private async ensureTempInGitignore() {
    const tempDir = join(process.cwd(), "temp");
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    const gitignorePath = join(process.cwd(), ".gitignore");
    if (!existsSync(gitignorePath)) {
      return;
    }

    const gitignoreContent = await readFile(gitignorePath, "utf-8");
    if (!gitignoreContent.includes("temp/")) {
      await appendFile(gitignorePath, "\n# Temporary files\ntemp/\n");
      this.logger.log("Added temp/ to .gitignore");
    }
  }
}
