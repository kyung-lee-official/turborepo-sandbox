import { Body, Controller, Post } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { generateTestFixturesBodySchema } from "./dto/generate-test-fixtures.dto";
import { GenerateTestFixturesService } from "./services/generate-test-fixtures/generate-test-fixtures.service";
import {
  generateTestFixturesApiBody,
  generateTestFixturesApiOperation,
} from "./swagger/sales-import-fixtures.swagger";

@ApiTags("Sales Import Fixtures")
@Controller("applications/sales-import-fixtures")
export class SalesImportFixturesController {
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
