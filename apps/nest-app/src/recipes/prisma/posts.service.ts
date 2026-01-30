import { Injectable } from "@nestjs/common";
import type { Post } from "@repo/database";
import type { CreatePostDto } from "./dto/create-post.dto";
import type { FindPostDto } from "./dto/find-posts.dto";
import type { PrismaService } from "./prisma.service";

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async createPost(createPostDto: CreatePostDto): Promise<Post> {
    const { userEmail, ...rest } = createPostDto;
    return await this.prisma.client.post.create({
      data: {
        ...rest,
        author: {
          connect: {
            email: createPostDto.userEmail,
          },
        },
      },
    });
  }

  async getAllPosts(): Promise<Post[]> {
    return await this.prisma.client.post.findMany({
      include: {
        author: true,
        categories: true,
      },
    });
  }

  async findPosts(findPostDto: FindPostDto): Promise<Post[]> {
    const { slugs, categoryNames } = findPostDto;
    return await this.prisma.client.post.findMany({
      where: {
        AND: [
          {
            slug: {
              in: slugs,
            },
          },
          {
            categories: {
              some: {
                name: {
                  in: categoryNames,
                },
              },
            },
          },
        ],
      },
      include: {
        categories: true,
      },
    });
  }
}
