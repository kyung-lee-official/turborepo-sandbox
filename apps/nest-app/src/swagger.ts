import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { OverviewModule } from "./overview/overview.module";
import { PrismaModule } from "./recipes/prisma/prisma.module";

export function setupSwagger(app: INestApplication) {
  const overviewOption = new DocumentBuilder()
    .setTitle("overview")
    .setDescription("# Overview")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();
  const overviewDocument = SwaggerModule.createDocument(app, overviewOption, {
    include: [OverviewModule],
  });
  SwaggerModule.setup("api/overview", app, overviewDocument);

  const prismaOption = new DocumentBuilder()
    .setTitle("prisma")
    .setDescription("# Prisma")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();
  const prismaDocument = SwaggerModule.createDocument(app, prismaOption, {
    include: [PrismaModule],
  });
  SwaggerModule.setup("api/recipes/prisma", app, prismaDocument);
}
