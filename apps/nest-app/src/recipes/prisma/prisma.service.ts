// apps/nest-app/src/prisma/prisma.service.ts
import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { prisma } from "@repo/database"; // shared client

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  // Expose the client instance for injection and use in other services
  public client = prisma;

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
