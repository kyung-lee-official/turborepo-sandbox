import type { ApiBodyOptions, ApiOperationOptions } from "@nestjs/swagger";
import type { CreatePerformanceDto } from "../dto/create-performance.dto";

export class CreatePerformance {
  score: number;
  ownerId: string;

  constructor(dto: CreatePerformanceDto) {
    this.score = dto.score;
    this.ownerId = dto.ownerId;
  }
}

export const createPerformanceOperationOptions: ApiOperationOptions = {
  summary: "Create a new performance",
  description: "Create a new performance",
};

export const createPerformanceBodyOptions: ApiBodyOptions = {
  type: CreatePerformance,
  examples: {
    "create-a-performance-for-bob": {
      value: {
        score: 5,
        ownerId: "bob",
      },
    },
  },
};
