import {
  type ArgumentMetadata,
  BadRequestException,
  type PipeTransform,
} from "@nestjs/common";
import { ZodError, type z } from "zod";
import type { SignUpDto } from "../dto/signup.dto";

export class SignUpPipe implements PipeTransform<SignUpDto, SignUpDto> {
  constructor(private schema: z.ZodType<SignUpDto>) {}

  transform(value: unknown, metadata: ArgumentMetadata): SignUpDto {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue as SignUpDto;
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
