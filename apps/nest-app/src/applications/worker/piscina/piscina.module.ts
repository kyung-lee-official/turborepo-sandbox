import { Module } from "@nestjs/common";
import { PiscinaController } from "./piscina.controller";
import { PiscinaService } from "./piscina.service";

@Module({
  controllers: [PiscinaController],
  providers: [PiscinaService],
})
export class PiscinaModule {}
