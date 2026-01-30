import { Module } from "@nestjs/common";
import { MockDataController } from "./mock-data.controller";
import { MockDataService } from "./mock-data.service";

@Module({
  imports: [],
  controllers: [MockDataController],
  providers: [MockDataService],
})
export class MockDataModule {}
