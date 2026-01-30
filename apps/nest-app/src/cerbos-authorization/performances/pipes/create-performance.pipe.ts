import {
  type ArgumentMetadata,
  BadRequestException,
  type PipeTransform,
} from "@nestjs/common";
import { ZodError, type z } from "zod";
import type { CreatePerformanceDto } from "../dto/create-performance.dto";

export class CreatePerformancePipe
  implements PipeTransform<CreatePerformanceDto, CreatePerformanceDto>
{
  constructor(private schema: z.ZodType<CreatePerformanceDto>) {}

  transform(value: unknown, metadata: ArgumentMetadata): CreatePerformanceDto {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue as CreatePerformanceDto;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(
          error.issues[0]?.message || "Validation failed",
        );
      }
      throw new BadRequestException("Validation failed");
    }
  }
}
