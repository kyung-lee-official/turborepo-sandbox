import { Test, type TestingModule } from "@nestjs/testing";
import { UploadLargeJsonController } from "./upload-large-json.controller";
import { UploadLargeJsonService } from "./upload-large-json.service";

describe("UploadLargeJsonController", () => {
  let controller: UploadLargeJsonController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadLargeJsonController],
      providers: [UploadLargeJsonService],
    }).compile();

    controller = module.get<UploadLargeJsonController>(
      UploadLargeJsonController,
    );
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
