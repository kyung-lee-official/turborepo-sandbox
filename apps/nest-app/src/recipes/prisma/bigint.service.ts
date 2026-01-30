import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Injectable()
export class BigIntService {
  constructor(private prisma: PrismaService) {}

  async createBigInt(bigint: bigint): Promise<{ id: number; value: string }> {
    const bi = await this.prisma.client.testBigInt.create({
      data: {
        value: BigInt(bigint),
      },
    });
    console.log(bi); /*  { id: 1, value: xxxxxxxxxxxxxn } */
    /**
     * bigint cannot be serialized therefore if you return it directly,
     * you got type error:
     * TypeError: Do not know how to serialize a BigInt
     * https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types#working-with-bigint
     */
    const stringifiedBigInt = {
      ...bi,
      value: bi.value.toString(),
    };
    return stringifiedBigInt;
  }

  async getBigInt(): Promise<{ id: number; value: string }[]> {
    const bis = await this.prisma.client.testBigInt.findMany();
    return bis.map((bi) => ({
      ...bi,
      value: bi.value.toString(),
    }));
  }

  async deteteBigInt(id: number): Promise<{ id: number; value: string }> {
    const res = await this.prisma.client.testBigInt.delete({
      where: {
        id,
      },
    });
    const stringifiedBigInt = {
      ...res,
      value: res.value.toString(),
    };
    return stringifiedBigInt;
  }
}
