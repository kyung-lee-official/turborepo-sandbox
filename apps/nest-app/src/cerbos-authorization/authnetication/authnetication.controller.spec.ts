import { Test, type TestingModule } from "@nestjs/testing";
import { AuthneticationController } from "./authnetication.controller";
import { AuthneticationService } from "./authnetication.service";

describe("AuthneticationController", () => {
  let controller: AuthneticationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthneticationController],
      providers: [AuthneticationService],
    }).compile();

    controller = module.get<AuthneticationController>(AuthneticationController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
