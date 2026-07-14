import { resolve } from "node:path";
import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Piscina } from "piscina";

@Injectable()
export class PiscinaService implements OnModuleDestroy {
  private readonly pool = new Piscina({
    filename: resolve(__dirname, "heavy-task.worker.js"),
    minThreads: 1,
    maxThreads: 4,
  });

  async runHeavyTask(
    max: number,
  ): Promise<{ primes: number; durationMs: number }> {
    const start = performance.now();
    const primes = await this.pool.run(max);
    const durationMs = Math.round(performance.now() - start);
    return { primes, durationMs };
  }

  async onModuleDestroy() {
    await this.pool.destroy();
  }
}
