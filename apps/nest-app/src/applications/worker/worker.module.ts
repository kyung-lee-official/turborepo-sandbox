import { Module } from "@nestjs/common";
import { PiscinaModule } from "./piscina/piscina.module";

@Module({
  imports: [PiscinaModule],
})
export class WorkerModule {}
