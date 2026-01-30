import { PartialType } from "@nestjs/mapped-types";
import { CreateTencentCosObjectDto } from "./create-tencent-cos-object.dto";

export class UpdateTencentCosObjectDto extends PartialType(
  CreateTencentCosObjectDto,
) {}
