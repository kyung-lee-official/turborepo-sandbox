import { Injectable } from "@nestjs/common";
import type { PrismaService } from "@/recipes/prisma/prisma.service";
import type { CreateMemberDto } from "./dto/create-member.dto";
import type { UpdateMemberDto } from "./dto/update-member.dto";

@Injectable()
export class MembersService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createMemberDto: CreateMemberDto) {
    const { id } = createMemberDto;
    return await this.prismaService.client.member.create({
      data: {
        id,
      },
    });
  }

  async findAll() {
    return await this.prismaService.client.member.findMany({
      include: {
        roles: true,
      },
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} member`;
  }

  update(id: number, _updateMemberDto: UpdateMemberDto) {
    return `This action updates a #${id} member`;
  }

  async remove(id: string) {
    return await this.prismaService.client.member.delete({
      where: {
        id,
      },
    });
  }
}
