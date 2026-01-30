import { Injectable } from "@nestjs/common";
import type { Group } from "@repo/database";
import type { PrismaService } from "./prisma.service";

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async createGroupWithOwner(body: any): Promise<Group> {
    const { name, email, ownerName } = body;
    const group = await this.prisma.client.group.create({
      data: {
        name: name,
        owner: {
          create: {
            email: email,
            name: ownerName,
          },
        },
        users: {
          connect: [
            {
              email: email,
            },
          ],
        },
      },
    });
    return group;
  }

  async getAllGroups(): Promise<Group[]> {
    return await this.prisma.client.group.findMany({
      include: {
        owner: {
          include: {
            groups: true,
          },
        },
      },
    });
  }
}
