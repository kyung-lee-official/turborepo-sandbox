import { Test, type TestingModule } from "@nestjs/testing";
import { TencentCosObjectsController } from "./tencent-cos-objects.controller";
import { TencentCosObjectsService } from "./tencent-cos-objects.service";

describe("TencentCosObjectsController", () => {
  let controller: TencentCosObjectsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TencentCosObjectsController],
      providers: [TencentCosObjectsService],
    }).compile();

    controller = module.get<TencentCosObjectsController>(
      TencentCosObjectsController,
    );
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
