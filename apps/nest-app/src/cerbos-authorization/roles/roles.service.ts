import { Injectable } from "@nestjs/common";
// import { UpdateRoleDto } from "./dto/update-role.dto";
import { PrismaService } from "@/recipes/prisma/prisma.service";
import type { CreateRoleDto } from "./dto/create-role.dto";
import type { UpdateRoleDto } from "./dto/update-role.dto";

@Injectable()
export class RolesService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createRoleDto: CreateRoleDto) {
    const { id } = createRoleDto;
    return await this.prismaService.client.role.create({
      data: {
        id,
      },
    });
  }

  async findAll() {
    return await this.prismaService.client.role.findMany({
      include: {
        members: true,
      },
    });
  }

  async findOne(id: string) {
    return await this.prismaService.client.role.findUnique({
      where: {
        id,
      },
    });
  }

  async update(updateRoleDto: UpdateRoleDto) {
    const { id, members } = updateRoleDto;
    return await this.prismaService.client.role.update({
      where: {
        id,
      },
      data: {
        members: {
          connect: members.map((member) => ({
            id: member,
          })),
        },
      },
    });
  }

  async remove(id: string) {
    const res = await this.prismaService.client.role.delete({
      where: {
        id,
      },
    });
    console.log(res);
    return res;
  }
}
