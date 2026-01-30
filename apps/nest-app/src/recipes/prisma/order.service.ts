import { Injectable } from "@nestjs/common";
import dayjs from "dayjs";
import type { PrismaService } from "./prisma.service";

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async createOrder() {
    const order = await this.prisma.client.testConnectOrCreateOrder.create({
      data: {
        product: {
          connectOrCreate: {
            where: {
              name: "Product 1",
            },
            create: {
              name: "Product 1",
            },
          },
        },
      },
    });
  }

  async createRetailSalesData() {
    const order = await this.prisma.client.retailSalesData.create({
      data: {
        /**
         * ❌ this won't work,
         * and Prisma (6.6.0) will report something incorrectly,
         * it says 'Types of property 'receiptType' are incompatible.'
         * but actually, you can fix this using `connect` or `connectOrCreate`,
         * because the `receiptType` is a relation field, not a scalar field.
         */
        // batchId: 1,

        /* ✅ this works */
        retailSalesDataBatch: {
          connect: {
            id: 1,
          },
        },
        date: dayjs().toISOString(),
        receiptType: {
          connectOrCreate: {
            where: { type: "d.receiptType" },
            create: { type: "d.receiptType" },
          },
        },
        client: {
          connectOrCreate: {
            where: { client: "d.client" },
            create: { client: "d.client" },
          },
        },
        department: {
          connectOrCreate: {
            where: { department: "d.department" },
            create: { department: "d.department" },
          },
        },
        sku: {
          connectOrCreate: {
            where: { sku: "d.sku" },
            create: { sku: "d.sku" },
          },
        },
        nameZhCn: "d.nameZhCn",
        salesVolume: 100,
        platformAddress: {
          connectOrCreate: {
            where: {
              platformAddress: "d.platformAddress",
            },
            create: {
              platformAddress: "d.platformAddress",
            },
          },
        },
        platformOrderId: "#order 1",
        storehouse: {
          connectOrCreate: {
            where: { storehouse: "d.storehouse" },
            create: { storehouse: "d.storehouse" },
          },
        },
        category: {
          connectOrCreate: {
            where: { category: "d.category" },
            create: { category: "d.category" },
          },
        },
        taxInclusivePriceCny: 1.1,
        priceCny: 1,
        unitPriceCny: 7,
      },
    });
    return order;
  }
}
