import { Test, type TestingModule } from "@nestjs/testing";
import { ChatGateway } from "./chat.gateway";
import { WebsocketsService } from "./websockets.service";

describe("ChatGateway", () => {
  let gateway: ChatGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatGateway, WebsocketsService],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
  });

  it("should be defined", () => {
    expect(gateway).toBeDefined();
  });
});
