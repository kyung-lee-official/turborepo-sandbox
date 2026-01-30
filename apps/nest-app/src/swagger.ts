import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ProgramLifecycleModule } from "./applications/program-lifecycle/program-lifecycle.module";
import { ResendModule } from "./applications/resend/resend.module";
import { UploadLargeJsonModule } from "./applications/upload-large-json/upload-large-json.module";
import { UploadLargeXlsxModule } from "./applications/upload-large-xlsx/upload-large-xlsx.module";
import { AssessmentsModule } from "./cerbos-authorization/assessments/assessments.module";
import { AuthneticationModule } from "./cerbos-authorization/authnetication/authnetication.module";
import { MembersModule } from "./cerbos-authorization/members/members.module";
import { PerformancesModule } from "./cerbos-authorization/performances/performances.module";
import { RolesModule } from "./cerbos-authorization/roles/roles.module";
import { OverviewModule } from "./overview/overview.module";
import { PrismaModule } from "./recipes/prisma/prisma.module";
import { TechniquesModule } from "./techniques/techniques.module";

export function setupSwagger(app: INestApplication) {
  const authOption = new DocumentBuilder()
    .setTitle("Cerbos Authorization")
    .setDescription("# Cerbos Authorization")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();
  const authDocument = SwaggerModule.createDocument(app, authOption, {
    include: [
      AuthneticationModule,
      MembersModule,
      RolesModule,
      PerformancesModule,
      AssessmentsModule,
    ],
  });
  SwaggerModule.setup("api/cerbos-authorization", app, authDocument);

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

  const techniquesOption = new DocumentBuilder()
    .setTitle("techniques")
    .setDescription("# Techniques")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();
  const techniquesDocument = SwaggerModule.createDocument(
    app,
    techniquesOption,
    {
      include: [TechniquesModule],
    },
  );
  SwaggerModule.setup("api/techniques", app, techniquesDocument);

  const applicationOption = new DocumentBuilder()
    .setTitle("Applications")
    .setDescription("# Applications")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();
  const applicationDocument = SwaggerModule.createDocument(
    app,
    applicationOption,
    {
      include: [
        ProgramLifecycleModule,
        UploadLargeJsonModule,
        UploadLargeXlsxModule,
        ResendModule,
      ],
    },
  );
  SwaggerModule.setup("api/applications", app, applicationDocument);

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
