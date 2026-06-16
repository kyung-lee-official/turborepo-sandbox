import { Body, Controller, Post } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { generateLargeExcelBodySchema } from "./dto/generate-large-excel.dto";
import { GenerateLargeExcelService } from "./services/generate-large-excel.service";
import {
  generateLargeExcelApiBody,
  generateLargeExcelApiOperation,
} from "./swagger/upload-large-xlsx.swagger";

@ApiTags("Upload Large Xlsx")
@Controller("applications/upload-large-xlsx")
export class UploadLargeXlsxController {
  constructor(
    private readonly generateLargeExcelService: GenerateLargeExcelService,
  ) {}

  @ApiOperation(generateLargeExcelApiOperation)
  @ApiBody(generateLargeExcelApiBody)
  @Post("generate-large-excel")
  async generateLargeExcel(@Body() body: unknown) {
    const parsed = generateLargeExcelBodySchema.parse(body ?? {});
    return this.generateLargeExcelService.generate(parsed);
  }
}
