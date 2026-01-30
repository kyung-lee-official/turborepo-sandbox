import { Test, type TestingModule } from "@nestjs/testing";
import { PerformancesController } from "./performances.controller";
import { PerformancesService } from "./performances.service";

describe("PerformancesController", () => {
  let controller: PerformancesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PerformancesController],
      providers: [PerformancesService],
    }).compile();

    controller = module.get<PerformancesController>(PerformancesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
