import { Injectable } from "@nestjs/common";
import type {
  DomainRunner,
  DomainRunnerIo,
  DomainRunResult,
  VerifiedProcessingSource,
} from "@/async-processing/async-processing.types";
import { parseJsonlLines } from "@/import/plugins/jsonl/parse-jsonl-lines";
import { scopeJsonlError } from "@/import/plugins/jsonl/scope-jsonl-errors";
import { loadWorkbookFromStream } from "@/import/plugins/tabular-xlsx/load-workbook-from-buffer";
import { parseSheetRows } from "@/import/plugins/tabular-xlsx/parse-sheet-rows";
import { scopeTabularError } from "@/import/plugins/tabular-xlsx/scope-tabular-errors";
import { createThrottledDomainProgressReporter } from "@/import/shared/create-throttled-domain-progress";
import type { ErrorDetail } from "@/import/shared/import-error.types";
import { PrismaService } from "@/recipes/prisma/prisma.service";
import {
  SALES_IMPORT_DOMAIN_KIND,
  SALES_IMPORT_SHEETS,
  SALES_IMPORT_SOURCE_IDS,
  salesImportInventorySheetSpec,
  salesImportLineItemsSheetSpec,
  salesImportProductsSheetSpec,
} from "./sales-import.constants";
import {
  type InventoryBySku,
  indexInventoryRow,
  indexProductRow,
  type MergedLineInsert,
  mergeLineItemRow,
  type ProductBySku,
} from "./sales-import-domain.validation";

const INSERT_BATCH_SIZE = 1000;

@Injectable()
export class SalesImportDomainRunner implements DomainRunner {
  readonly domainKind = SALES_IMPORT_DOMAIN_KIND;

  constructor(private readonly prisma: PrismaService) {}

  async run(
    jobId: string,
    sources: Map<string, VerifiedProcessingSource>,
    io: DomainRunnerIo,
  ): Promise<DomainRunResult> {
    const salesData = sources.get(SALES_IMPORT_SOURCE_IDS.salesData);
    const inventory = sources.get(SALES_IMPORT_SOURCE_IDS.inventory);
    const productDescriptions = sources.get(
      SALES_IMPORT_SOURCE_IDS.productDescriptions,
    );

    if (!salesData || !inventory || !productDescriptions) {
      throw new Error("Missing required upload sources for sales-report");
    }

    const errors: ErrorDetail[] = [];

    const salesStream = await io.openStream(salesData);
    const salesWorkbook = await loadWorkbookFromStream(salesStream);

    if (!salesWorkbook.getWorksheet(SALES_IMPORT_SHEETS.lineItems)) {
      throw new Error(`Worksheet not found: ${SALES_IMPORT_SHEETS.lineItems}`);
    }

    const productsBySku = new Map<string, ProductBySku>();
    const salesCtx = {
      sourceId: salesData.sourceId,
      label: salesData.label,
    };

    await parseSheetRows(
      salesWorkbook,
      salesImportProductsSheetSpec,
      salesCtx,
      {
        onRow: ({ cells }) => {
          const product = indexProductRow(cells);
          if (product) {
            productsBySku.set(cells.SKU!, product);
          }
        },
        pushError: (error) => {
          errors.push(
            scopeTabularError(error, {
              sourceId: salesData.sourceId,
              originalName: salesData.label,
              worksheetName: salesImportProductsSheetSpec.sheetName,
            }),
          );
        },
      },
    );

    const inventoryBySku = new Map<string, InventoryBySku>();
    const inventoryStream = await io.openStream(inventory);
    const inventoryWorkbook = await loadWorkbookFromStream(inventoryStream);
    const inventoryCtx = {
      sourceId: inventory.sourceId,
      label: inventory.label,
    };

    await parseSheetRows(
      inventoryWorkbook,
      salesImportInventorySheetSpec,
      inventoryCtx,
      {
        onRow: ({ cells }) => {
          const row = indexInventoryRow(cells);
          if (row) {
            inventoryBySku.set(cells.SKU!, row);
          }
        },
        pushError: (error) => {
          errors.push(
            scopeTabularError(error, {
              sourceId: inventory.sourceId,
              originalName: inventory.label,
              worksheetName: salesImportInventorySheetSpec.sheetName,
            }),
          );
        },
      },
    );

    const descriptionsBySku = new Map<string, string>();
    const jsonlStream = await io.openStream(productDescriptions);
    const jsonlCtx = {
      sourceId: productDescriptions.sourceId,
      label: productDescriptions.label,
    };

    await parseJsonlLines(jsonlStream, jsonlCtx, {
      onLine: ({ record }) => {
        const sku = record.sku;
        if (typeof sku !== "string" || !sku) {
          return;
        }
        const description =
          typeof record.description === "string" ? record.description : "";
        descriptionsBySku.set(sku, description);
      },
      pushError: (error) => {
        errors.push(
          scopeJsonlError(error, {
            sourceId: productDescriptions.sourceId,
            originalName: productDescriptions.label,
          }),
        );
      },
    });

    const validRows: MergedLineInsert[] = [];
    const validatingProgress = createThrottledDomainProgressReporter(
      io.onProgress,
      "validating_rows",
      salesData.sourceId,
      {
        originalName: salesData.label,
        worksheetName: salesImportLineItemsSheetSpec.sheetName,
      },
    );

    let validCount = 0;
    let lineItemErrorCount = 0;
    let lastValidatedTotal = 0;
    let lastValidatedProcessed = 0;

    await parseSheetRows(
      salesWorkbook,
      salesImportLineItemsSheetSpec,
      salesCtx,
      {
        onProgress: async ({ processedCount, totalCount }) => {
          lastValidatedTotal = totalCount;
          lastValidatedProcessed = processedCount;
          await validatingProgress.report({
            totalCount,
            processedCount,
            validCount,
            errorCount: lineItemErrorCount,
          });
        },
        onRow: ({ rowNumber, cells }) => {
          const result = mergeLineItemRow(
            rowNumber,
            cells,
            productsBySku,
            inventoryBySku,
            descriptionsBySku,
          );
          if (!result.ok) {
            lineItemErrorCount++;
            errors.push(
              scopeTabularError(result.error, {
                sourceId: salesData.sourceId,
                originalName: salesData.label,
                worksheetName: salesImportLineItemsSheetSpec.sheetName,
              }),
            );
            return;
          }
          validCount++;
          validRows.push(result.row);
        },
        pushError: (error) => {
          errors.push(
            scopeTabularError(error, {
              sourceId: salesData.sourceId,
              originalName: salesData.label,
              worksheetName: salesImportLineItemsSheetSpec.sheetName,
            }),
          );
        },
      },
    );

    await validatingProgress.flush({
      totalCount: lastValidatedTotal,
      processedCount: lastValidatedProcessed,
      validCount,
      errorCount: lineItemErrorCount,
    });

    const savingProgress = createThrottledDomainProgressReporter(
      io.onProgress,
      "saving_database",
      salesData.sourceId,
      {
        originalName: salesData.label,
      },
    );

    const totalToSave = validRows.length;
    await savingProgress.flush({
      totalCount: totalToSave,
      processedCount: 0,
      validCount: 0,
    });

    await this.insertMergedLines(jobId, validRows, async (insertedCount) => {
      await savingProgress.report({
        totalCount: totalToSave,
        processedCount: insertedCount,
        validCount: insertedCount,
      });
    });

    await savingProgress.flush({
      totalCount: totalToSave,
      processedCount: totalToSave,
      validCount: totalToSave,
    });

    if (errors.length > 0) {
      return {
        outcome: "validation_failed",
        processedCount: validRows.length,
        errorCount: errors.length,
        errors,
      };
    }

    return {
      outcome: "success",
      processedCount: validRows.length,
      errorCount: 0,
    };
  }

  private async insertMergedLines(
    jobId: string,
    rows: readonly MergedLineInsert[],
    onBatchInserted?: (insertedCount: number) => Promise<void>,
  ): Promise<void> {
    let insertedCount = 0;
    for (let offset = 0; offset < rows.length; offset += INSERT_BATCH_SIZE) {
      const batch = rows.slice(offset, offset + INSERT_BATCH_SIZE);
      await this.prisma.client.salesImportMergedLine.createMany({
        data: batch.map((row) => ({
          processingJobId: jobId,
          sourceLineNumber: row.sourceLineNumber,
          orderId: row.orderId,
          sku: row.sku,
          quantity: row.quantity,
          saleDate: row.saleDate,
          productName: row.productName,
          category: row.category,
          unitPrice: row.unitPrice,
          inventoryQty: row.inventoryQty,
          description: row.description,
        })),
      });
      insertedCount += batch.length;
      await onBatchInserted?.(insertedCount);
    }
  }
}
