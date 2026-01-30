import { Module } from "@nestjs/common";
import { ChatGateway } from "./chat.gateway";
import { DashboardGateway } from "./dashboard.gateway";
import { ChatService } from "./websockets.service";

@Module({
  providers: [ChatGateway, ChatService, DashboardGateway],
})
export class WebsocketsModule {}
