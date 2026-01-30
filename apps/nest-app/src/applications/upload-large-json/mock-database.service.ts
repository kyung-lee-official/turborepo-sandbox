import { Injectable } from "@nestjs/common";

@Injectable()
export class MockDatabaseService {
  private database: any[] = [];

  constructor() {}

  async create(data: any) {
    this.database.push(data);
    return { success: true };
  }

  async findAll() {
    return this.database;
  }

  async deleteManyByBatchId(batchId: number) {
    this.database = this.database.filter((item) => item.batchId !== batchId);
    return { success: true };
  }
}
