import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class JsonFieldFilterDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  recoveryEmail!: string;
}
