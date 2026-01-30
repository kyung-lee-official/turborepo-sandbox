import { Test, type TestingModule } from "@nestjs/testing";
import { TechniquesService } from "./techniques.service";

describe("TechniquesService", () => {
  let service: TechniquesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TechniquesService],
    }).compile();

    service = module.get<TechniquesService>(TechniquesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
