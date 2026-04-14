import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { join } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const uploadPath = process.env.UPLOAD_PATH ?? './uploads';
  app.useStaticAssets(join(process.cwd(), uploadPath), {
    prefix: '/uploads/',
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
