import { Test, type TestingModule } from "@nestjs/testing";
import { ProgramLifecycleController } from "./program-lifecycle.controller";
import { ProgramLifecycleService } from "./program-lifecycle.service";

describe("ProgramLifecycleController", () => {
  let controller: ProgramLifecycleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgramLifecycleController],
      providers: [ProgramLifecycleService],
    }).compile();

    controller = module.get<ProgramLifecycleController>(
      ProgramLifecycleController,
    );
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
