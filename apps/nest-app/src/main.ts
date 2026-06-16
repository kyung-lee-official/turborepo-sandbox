import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { setupSwagger } from "./swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(",") || [],
    exposedHeaders: ["Content-Disposition", "X-Error-Code", "X-Error-Message"],
  });

  setupSwagger(app);

  await app.listen(3001);
}
bootstrap();
