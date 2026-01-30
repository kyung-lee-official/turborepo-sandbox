import { Injectable } from "@nestjs/common";
import type { Event } from "@repo/database";
import type { CreateEventDto } from "./dto/create-event.dto";
import type { PrismaService } from "./prisma.service";

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async createEvent(createEventDto: CreateEventDto): Promise<Event> {
    return await this.prisma.client.event.create({
      data: createEventDto,
    });
  }

  async getAllEvents(): Promise<Event[]> {
    return await this.prisma.client.event.findMany();
  }
}
