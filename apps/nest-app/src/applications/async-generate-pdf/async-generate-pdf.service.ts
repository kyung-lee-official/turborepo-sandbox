import { mkdir, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { Injectable, NotFoundException } from "@nestjs/common";
import { nanoid } from "nanoid";

export type AsyncGeneratePdfJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type GeneratedPdfFile = {
  name: string;
  sizeBytes: number;
};

export type AsyncGeneratePdfInfoRow = {
  name: string;
  email: string;
  age: number;
  gender: string;
  invoiceDate: string;
};

const MOCK_INFO_ROWS: AsyncGeneratePdfInfoRow[] = [
  {
    name: "Ada Lovelace",
    email: "ada.lovelace@example.com",
    age: 36,
    gender: "Female",
    invoiceDate: "2026-01-15",
  },
  {
    name: "Grace Hopper",
    email: "grace.hopper@example.com",
    age: 45,
    gender: "Female",
    invoiceDate: "2026-02-03",
  },
  {
    name: "Alan Turing",
    email: "alan.turing@example.com",
    age: 41,
    gender: "Male",
    invoiceDate: "2026-02-18",
  },
  {
    name: "Katherine Johnson",
    email: "katherine.johnson@example.com",
    age: 52,
    gender: "Female",
    invoiceDate: "2026-03-07",
  },
  {
    name: "Tim Berners-Lee",
    email: "tim.berners-lee@example.com",
    age: 38,
    gender: "Male",
    invoiceDate: "2026-03-22",
  },
];

export type AsyncGeneratePdfJob = {
  id: string;
  status: AsyncGeneratePdfJobStatus;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
  outputFiles: GeneratedPdfFile[];
};

@Injectable()
export class AsyncGeneratePdfService {
  private readonly outputDir = join(
    process.cwd(),
    "temp",
    "async-generate-pdf",
  );
  private readonly jobsById = new Map<string, AsyncGeneratePdfJob>();

  getOutputDir(): string {
    return this.outputDir;
  }

  listMockInfo(): AsyncGeneratePdfInfoRow[] {
    return MOCK_INFO_ROWS;
  }

  getTemplateInfo(): {
    module: string;
    outputDir: string;
    endpoints: string[];
  } {
    return {
      module: "async-generate-pdf",
      outputDir: this.outputDir,
      endpoints: [
        "GET /async-generate-pdf/info",
        "POST /async-generate-pdf/jobs",
        "GET /async-generate-pdf/jobs/:jobId",
        "GET /async-generate-pdf/files",
      ],
    };
  }

  async startJob(): Promise<AsyncGeneratePdfJob> {
    await mkdir(this.outputDir, { recursive: true });

    const now = new Date().toISOString();
    const job: AsyncGeneratePdfJob = {
      id: nanoid(),
      status: "queued",
      progressPercent: 0,
      createdAt: now,
      updatedAt: now,
      outputFiles: [],
    };

    this.jobsById.set(job.id, job);
    return job;
  }

  getJobById(jobId: string): AsyncGeneratePdfJob {
    const job = this.jobsById.get(jobId);
    if (!job) {
      throw new NotFoundException(`Job not found: ${jobId}`);
    }
    return job;
  }

  async listOutputFiles(): Promise<GeneratedPdfFile[]> {
    await mkdir(this.outputDir, { recursive: true });

    const entries = await readdir(this.outputDir, { withFileTypes: true });
    const files = entries.filter(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"),
    );

    return Promise.all(
      files.map(async (entry) => {
        const filePath = join(this.outputDir, entry.name);
        const fileStat = await stat(filePath);
        return {
          name: entry.name,
          sizeBytes: fileStat.size,
        };
      }),
    );
  }
}
