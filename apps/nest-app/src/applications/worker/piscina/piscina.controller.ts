import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PiscinaService } from "./piscina.service";

@ApiTags("Worker | Piscina")
@Controller("worker/piscina")
export class PiscinaController {
  constructor(private readonly piscinaService: PiscinaService) {}

  @ApiOperation({ summary: "Count primes using a Piscina worker thread" })
  @Get("count-primes")
  async countPrimes(@Query("max") max?: string) {
    const limit = max ? Number(max) : 1_000_000;
    return this.piscinaService.runHeavyTask(limit);
  }

  @ApiOperation({
    summary: "Instant response — proves the event loop isn't blocked",
  })
  @Get("ping")
  ping() {
    return { pong: true, at: new Date().toISOString() };
  }
}
