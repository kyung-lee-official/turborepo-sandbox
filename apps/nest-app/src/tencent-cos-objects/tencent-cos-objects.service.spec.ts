import { Test, type TestingModule } from "@nestjs/testing";
import { TencentCosObjectsService } from "./tencent-cos-objects.service";

describe("TencentCosObjectsService", () => {
  let service: TencentCosObjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TencentCosObjectsService],
    }).compile();

    service = module.get<TencentCosObjectsService>(TencentCosObjectsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
