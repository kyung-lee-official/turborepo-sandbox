import { Injectable, NotFoundException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import type { PrismaService } from "@/recipes/prisma/prisma.service";
import type { SignInDto } from "./dto/signin.dto";
import type { SignUpDto } from "./dto/signup.dto";

@Injectable()
export class AuthneticationService {
  constructor(
    private readonly prismaService: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const { id } = signUpDto;
    return await this.prismaService.client.member.create({
      data: {
        id,
      },
    });
  }

  async signIn(signInDto: SignInDto) {
    const { id } = signInDto;
    const member = await this.prismaService.client.member.findUnique({
      where: {
        id,
      },
    });
    if (!member) {
      throw new NotFoundException(`Member with id ${id} not found`);
    }
    const jwt = this.jwtService.sign({ id });
    return { jwt };
  }
}
