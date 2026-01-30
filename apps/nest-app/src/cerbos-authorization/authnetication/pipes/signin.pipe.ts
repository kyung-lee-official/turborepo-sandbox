import {
  type ArgumentMetadata,
  BadRequestException,
  type PipeTransform,
} from "@nestjs/common";
import { ZodError, type z } from "zod";
import type { SignInDto } from "../dto/signin.dto";

export class SignInPipe implements PipeTransform<SignInDto, SignInDto> {
  constructor(private schema: z.ZodType<SignInDto>) {}

  transform(value: unknown, metadata: ArgumentMetadata): SignInDto {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue as SignInDto;
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
