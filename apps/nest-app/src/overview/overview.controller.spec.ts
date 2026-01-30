import { Test, type TestingModule } from "@nestjs/testing";
import { OverviewController } from "./overview.controller";
import { OverviewService } from "./overview.service";

describe("OverviewController", () => {
  let controller: OverviewController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OverviewController],
      providers: [OverviewService],
    }).compile();

    controller = module.get<OverviewController>(OverviewController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
