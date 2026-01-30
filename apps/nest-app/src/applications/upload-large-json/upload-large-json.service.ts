import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import * as zlib from "zlib";
import type { MockDatabaseService } from "./mock-database.service";
import type { UploadLargeJsonQueueService } from "./upload-large-json-queue.service";

@Injectable()
export class UploadLargeJsonService {
  constructor(
    private readonly uploadLargeJsonQueueService: UploadLargeJsonQueueService,
    private readonly mockDatabaseService: MockDatabaseService,
  ) {}

  async create(data: Express.Multer.File) {
    if (!data) {
      throw new BadRequestException("No data uploaded");
    }
    try {
      /* convert binary data to JSON */
      const decompressedData = zlib.gunzipSync(data.buffer);
      const parsedData = JSON.parse(decompressedData.toString("utf-8"));
      const chunkifiedData = this.chunkifyArray(parsedData, 10);
      for (const [i, chunk] of chunkifiedData.entries()) {
        await this.uploadLargeJsonQueueService.addJob({
          meta: {
            currenJobIndex: i + 1,
            totalJobs: chunkifiedData.length,
          },
          payload: chunk,
        });
      }
      return { success: true };
    } catch (error) {
      console.error("Error processing binary data:", error);
      throw new InternalServerErrorException(
        "An error occurred while processing binary data.",
      );
    }
  }

  async findAll() {
    const data = await this.mockDatabaseService.findAll();
    if (!data) {
      throw new InternalServerErrorException(
        "An error occurred while fetching data.",
      );
    }
    /* return first 10 records for performance */
    return data.slice(0, 10);
  }

  async remove(batchId: number) {
    return await this.mockDatabaseService.deleteManyByBatchId(batchId);
  }

  chunkifyArray<T>(array: T[], chunkSize: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      result.push(array.slice(i, i + chunkSize));
    }
    return result;
  }
}
