import {
  type ArgumentMetadata,
  BadRequestException,
  type PipeTransform,
} from "@nestjs/common";
import { ZodError, type z } from "zod";

export class ZodValidationPipe<T>
  implements
    PipeTransform<
      unknown,
      {
        value: T;
        type: "body" | "query" | "param" | "custom";
      }
    >
{
  constructor(private schema: z.ZodType<T>) {}

  transform(
    value: unknown,
    metadata: ArgumentMetadata,
  ): {
    value: T;
    type: "body" | "query" | "param" | "custom";
  } {
    try {
      const parsedValue = this.schema.parse(value);
      return {
        value: parsedValue,
        type: metadata.type,
      };
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
