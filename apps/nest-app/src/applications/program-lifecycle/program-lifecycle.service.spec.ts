import { Test, type TestingModule } from "@nestjs/testing";
import { ProgramLifecycleService } from "./program-lifecycle.service";

describe("ProgramLifecycleService", () => {
  let service: ProgramLifecycleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProgramLifecycleService],
    }).compile();

    service = module.get<ProgramLifecycleService>(ProgramLifecycleService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
