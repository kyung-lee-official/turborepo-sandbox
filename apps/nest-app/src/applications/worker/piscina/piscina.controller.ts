import { randomUUID } from "node:crypto";
import { Controller, Get, type MessageEvent, Query, Sse } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Observable } from "rxjs";
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

  @ApiOperation({ summary: "Stream prime-counting progress via SSE" })
  @Sse("count-primes/stream")
  streamCountPrimes(@Query("max") max?: string): Observable<MessageEvent> {
    const limit = max ? Number(max) : 1_000_000;
    const requestId = randomUUID();
    return this.piscinaService.streamProgress(requestId, limit);
  }

  @ApiOperation({
    summary: "Instant response — proves the event loop isn't blocked",
  })
  @Get("ping")
  ping() {
    return { pong: true, at: new Date().toISOString() };
  }
}
