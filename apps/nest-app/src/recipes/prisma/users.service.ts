import { Injectable } from "@nestjs/common";
import type { User } from "@repo/database";
import type { CreateUserDto } from "./dto/create-user.dto";
import type { JsonFieldFilterDto } from "./dto/json-field-filter";
import type { UpdateUserDto } from "./dto/update-user.dto";
import { PrismaService } from "./prisma.service";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    return await this.prisma.client.user.create({
      data: {
        ...createUserDto,
        titles: {
          create: createUserDto.titles,
        },
      },
    });
  }

  async getAllUsers(): Promise<User[]> {
    return await this.prisma.client.user.findMany({
      include: {
        posts: {
          include: {
            categories: true,
          },
        },
      },
    });
  }

  async updateUser(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    return await this.prisma.client.user.update({
      where: { id },
      data: {
        ...updateUserDto,
      },
    });
  }

  async findUsersByJsonField(
    JsonFieldFilterDto: JsonFieldFilterDto,
  ): Promise<User[]> {
    const { recoveryEmail } = JsonFieldFilterDto;
    const users = await this.prisma.client.user.findMany({
      where: {
        recoveryEmails: {
          has: recoveryEmail,
        },
      },
    });
    return users;
  }
}
