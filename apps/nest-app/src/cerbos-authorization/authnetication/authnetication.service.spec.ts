import { Test, type TestingModule } from "@nestjs/testing";
import { AuthneticationService } from "./authnetication.service";

describe("AuthneticationService", () => {
  let service: AuthneticationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthneticationService],
    }).compile();

    service = module.get<AuthneticationService>(AuthneticationService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
