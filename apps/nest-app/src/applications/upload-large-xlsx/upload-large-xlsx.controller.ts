import { Body, Controller, Post } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { generateTestFixturesBodySchema } from "./dto/generate-test-fixtures.dto";
import { GenerateTestFixturesService } from "./services/generate-test-fixtures/generate-test-fixtures.service";
import {
  generateTestFixturesApiBody,
  generateTestFixturesApiOperation,
} from "./swagger/upload-large-xlsx.swagger";

@ApiTags("Upload Large Xlsx")
@Controller("applications/upload-large-xlsx")
export class UploadLargeXlsxController {
  constructor(
    private readonly generateTestFixturesService: GenerateTestFixturesService,
  ) {}

  @ApiOperation(generateTestFixturesApiOperation)
  @ApiBody(generateTestFixturesApiBody)
  @Post("generate-test-fixtures")
  async generateTestFixtures(@Body() body: unknown) {
    const parsed = generateTestFixturesBodySchema.parse(body ?? {});
    return this.generateTestFixturesService.generate(parsed);
  }
}
