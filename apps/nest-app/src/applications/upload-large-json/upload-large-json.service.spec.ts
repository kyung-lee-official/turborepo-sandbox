import { Test, type TestingModule } from "@nestjs/testing";
import { UploadLargeJsonService } from "./upload-large-json.service";

describe("UploadLargeJsonService", () => {
  let service: UploadLargeJsonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadLargeJsonService],
    }).compile();

    service = module.get<UploadLargeJsonService>(UploadLargeJsonService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
