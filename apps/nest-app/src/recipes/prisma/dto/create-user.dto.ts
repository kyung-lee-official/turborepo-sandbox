import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEmail, IsNotEmpty, IsString, ValidateNested } from "class-validator";

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty()
  @IsEmail({}, { each: true })
  @IsNotEmpty()
  recoveryEmails!: string[];

  @ApiProperty()
  @ValidateNested({ each: true })
  @Type(() => Title)
  titles: string | undefined;
}

class Title {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  field!: string;
}
