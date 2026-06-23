import { existsSync, mkdirSync } from "node:fs";
import { appendFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Injectable, Logger } from "@nestjs/common";
import type {
  FixtureBundle,
  GenerateTestFixturesBodyDto,
  GenerateTestFixturesResult,
  ProductsSheetVariant,
  SalesDataFixtureFile,
} from "../../dto/generate-test-fixtures.dto";
import { buildInventoryWorkbook } from "./helpers/build-inventory-workbook";
import { buildProductDescriptionsJsonl } from "./helpers/build-product-descriptions-jsonl";
import { buildSalesDataWorkbook } from "./helpers/build-sales-data-workbook";
import {
  ALL_PRODUCTS_SHEET_VARIANTS,
  FIXTURE_FILE_NAMES,
  MIME_TYPES,
  SALES_DATA_VARIANT_FILE_NAMES,
} from "./helpers/sales-fixture.constants";
import { buildSkuPool } from "./helpers/sku-pool";

function expectedOutcomeForProductsVariant(
  variant: ProductsSheetVariant,
): SalesDataFixtureFile["expectedOutcome"] {
  switch (variant) {
    case "perfect":
      return "success";
    case "partially_available":
      return "validation_failed";
    case "fail_fast":
      return "failed";
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}

@Injectable()
export class GenerateTestFixturesService {
  private readonly logger = new Logger(GenerateTestFixturesService.name);

  async generate(
    _body: GenerateTestFixturesBodyDto,
  ): Promise<GenerateTestFixturesResult> {
    const startTime = Date.now();

    await this.ensureTempInGitignore();

    this.logger.log("Generating sales-import fixture bundle...");
    const bundle = await this.generateBundle();

    return {
      success: true,
      bundle,
      totalTimeMs: Date.now() - startTime,
    };
  }

  private async generateBundle(): Promise<FixtureBundle> {
    const bundleStart = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const bundleDir = join(process.cwd(), "temp", `sales-import-${timestamp}`);
    mkdirSync(bundleDir, { recursive: true });

    const pool = buildSkuPool();

    const inventoryPath = join(bundleDir, FIXTURE_FILE_NAMES.inventory);
    const inventory = await buildInventoryWorkbook({
      filepath: inventoryPath,
      pool,
    });

    const jsonlPath = join(bundleDir, FIXTURE_FILE_NAMES.productDescriptions);
    const jsonl = await buildProductDescriptionsJsonl({
      filepath: jsonlPath,
      pool,
    });

    const salesDataVariants: SalesDataFixtureFile[] = [];
    for (const productsVariant of ALL_PRODUCTS_SHEET_VARIANTS) {
      const originalName = SALES_DATA_VARIANT_FILE_NAMES[productsVariant];
      const salesDataPath = join(bundleDir, originalName);
      const salesData = await buildSalesDataWorkbook({
        filepath: salesDataPath,
        productsVariant,
        pool,
      });

      salesDataVariants.push({
        originalName,
        filepath: salesDataPath,
        mimeType: MIME_TYPES.xlsx,
        worksheets: salesData.worksheets,
        rowCount: salesData.rowCount,
        productsVariant,
        expectedOutcome: expectedOutcomeForProductsVariant(productsVariant),
      });
    }

    return {
      bundleDir,
      inventory: {
        originalName: FIXTURE_FILE_NAMES.inventory,
        filepath: inventoryPath,
        mimeType: MIME_TYPES.xlsx,
        worksheets: inventory.worksheets,
        rowCount: inventory.rowCount,
      },
      productDescriptions: {
        originalName: FIXTURE_FILE_NAMES.productDescriptions,
        filepath: jsonlPath,
        mimeType: MIME_TYPES.jsonl,
        lineCount: jsonl.lineCount,
      },
      salesDataVariants,
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
