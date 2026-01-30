import { Injectable } from "@nestjs/common";
import type { CreateCategoryDto } from "./dto/create-category.dto";
import type { UpdateCategoryDto } from "./dto/update-category.dto";
import type { PrismaService } from "./prisma.service";

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async createCategory(createCategoryDto: CreateCategoryDto) {
    const { name } = createCategoryDto;
    return await this.prisma.client.category.create({
      data: {
        name,
      },
    });
  }

  async getAllCategories() {
    return await this.prisma.client.category.findMany({
      include: {
        posts: true,
      },
    });
  }

  async updateCategory(updateCategoryDto: UpdateCategoryDto) {
    const { name, postSlugs } = updateCategoryDto;
    return await this.prisma.client.category.update({
      where: {
        name,
      },
      data: {
        name,
        posts: {
          connect: postSlugs.map((slug) => ({ slug })),
        },
      },
    });
  }
}
