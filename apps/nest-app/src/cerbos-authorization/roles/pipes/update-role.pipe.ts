import {
  type ArgumentMetadata,
  BadRequestException,
  type PipeTransform,
} from "@nestjs/common";
import { ZodError, type z } from "zod";
import type { UpdateRoleDto } from "../dto/update-role.dto";

export class UpdateRolePipe
  implements PipeTransform<UpdateRoleDto, UpdateRoleDto>
{
  constructor(private schema: z.ZodType<UpdateRoleDto>) {}

  transform(value: unknown, metadata: ArgumentMetadata): UpdateRoleDto {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue as UpdateRoleDto;
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
