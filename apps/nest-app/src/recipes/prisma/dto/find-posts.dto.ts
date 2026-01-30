import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class FindPostDto {
  @ApiProperty()
  @IsString({ each: true })
  @IsOptional()
  slugs?: string[];

  @ApiProperty()
  @IsString({ each: true })
  @IsOptional()
  categoryNames?: string[];
}
