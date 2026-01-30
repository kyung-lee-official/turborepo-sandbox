import { Test, type TestingModule } from "@nestjs/testing";
import { TechniquesController } from "./techniques.controller";
import { TechniquesService } from "./techniques.service";

describe("TechniquesController", () => {
  let controller: TechniquesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TechniquesController],
      providers: [TechniquesService],
    }).compile();

    controller = module.get<TechniquesController>(TechniquesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
