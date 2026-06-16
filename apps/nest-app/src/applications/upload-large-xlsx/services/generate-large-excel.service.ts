import { Injectable, Logger } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import type {
  GenerateLargeExcelBodyDto,
  GenerateLargeExcelResult,
} from "../dto/generate-large-excel.dto";

const firstNames = [
  "John",
  "Jane",
  "Michael",
  "Sarah",
  "David",
  "Emily",
  "James",
  "Lisa",
  "Robert",
  "Amanda",
  "William",
  "Jessica",
  "Richard",
  "Ashley",
  "Joseph",
  "Brittany",
  "Thomas",
  "Samantha",
  "Charles",
  "Michelle",
  "Christopher",
  "Elizabeth",
  "Daniel",
  "Kimberly",
  "Matthew",
  "Amy",
  "Anthony",
  "Angela",
];

const lastNames = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
];

const genders = ["Male", "Female", "Non-binary", "Prefer not to say"];
const invalidGenders = [
  "Invalid",
  "",
  null,
  undefined,
  "123",
  "Unknown Gender Type",
];
const invalidNames = [
  "",
  null,
  undefined,
  "123456",
  "Name@#$",
  "Very Long Name That Exceeds Normal Database Limits And Should Cause Validation Errors",
];

const getRandomName = (isValid: boolean) => {
  if (!isValid && Math.random() < 0.3) {
    return invalidNames[Math.floor(Math.random() * invalidNames.length)];
  }
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName}`;
};

const getRandomGender = (isValid: boolean) => {
  if (!isValid && Math.random() < 0.2) {
    return invalidGenders[Math.floor(Math.random() * invalidGenders.length)];
  }
  return genders[Math.floor(Math.random() * genders.length)];
};

const getRandomBioId = (isValid: boolean) => {
  if (!isValid && Math.random() < 0.15) {
    const invalidOptions = [
      "",
      null,
      undefined,
      "123",
      "invalid-bio-id-that-is-way-too-long-for-normal-use",
      "bio@#$%",
      "duplicate-id",
    ];
    return invalidOptions[Math.floor(Math.random() * invalidOptions.length)];
  }
  return nanoid(12);
};

@Injectable()
export class GenerateLargeExcelService {
  private readonly logger = new Logger(GenerateLargeExcelService.name);

  async generate(
    body: GenerateLargeExcelBodyDto,
  ): Promise<GenerateLargeExcelResult> {
    const isValidData = body.fileType === "valid";
    const dataTypeLabel = isValidData ? "valid" : "invalid";

    this.logger.log(`Generating ${dataTypeLabel} data file...`);

    const tempDir = path.join(process.cwd(), "temp");
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
      this.logger.log("Created temp directory");
    }

    await this.ensureTempInGitignore();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Mock Data");

    worksheet.columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Gender", key: "gender", width: 15 },
      { header: "Bio-ID", key: "bioId", width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    const startTime = Date.now();
    const batchSize = 10_000;
    const totalRows = 500_000;
    const batches = Math.ceil(totalRows / batchSize);

    this.logger.log("Starting data generation for 500,000 rows...");

    for (let batch = 0; batch < batches; batch++) {
      const batchData: {
        name: string | null | undefined;
        gender: string | null | undefined;
        bioId: string | null | undefined;
      }[] = [];
      const rowsInBatch = Math.min(batchSize, totalRows - batch * batchSize);

      for (let i = 0; i < rowsInBatch; i++) {
        batchData.push({
          name: getRandomName(isValidData),
          gender: getRandomGender(isValidData),
          bioId: getRandomBioId(isValidData),
        });
      }

      worksheet.addRows(batchData);

      const progress = Math.round(((batch + 1) / batches) * 100);
      this.logger.log(`Progress: ${progress}% (Batch ${batch + 1}/${batches})`);
    }

    const generationTime = Date.now() - startTime;
    this.logger.log(`Data generation completed in ${generationTime}ms`);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `mock-data-500k-${dataTypeLabel}-${timestamp}.xlsx`;
    const filepath = path.join(tempDir, filename);

    this.logger.log("Writing Excel file...");
    const writeStartTime = Date.now();
    await workbook.xlsx.writeFile(filepath);
    const writeTime = Date.now() - writeStartTime;
    const totalTime = Date.now() - startTime;

    const stats = statSync(filepath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    this.logger.log(`Excel file written in ${writeTime}ms`);
    this.logger.log(`Total process completed in ${totalTime}ms`);

    return {
      success: true,
      filename,
      filepath,
      fileType: dataTypeLabel,
      rows: totalRows + 1,
      fileSizeMB: `${fileSizeMB} MB`,
      generationTimeMs: generationTime,
      writeTimeMs: writeTime,
      totalTimeMs: totalTime,
    };
  }

  private async ensureTempInGitignore() {
    const gitignorePath = path.join(process.cwd(), ".gitignore");
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
