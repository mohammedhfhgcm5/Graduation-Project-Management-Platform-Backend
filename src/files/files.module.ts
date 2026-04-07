import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { extname } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { PrismaModule } from '../prisma/prisma.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uploadPath =
          configService.get<string>('UPLOAD_PATH') ?? './uploads';
        const maxFileSize = Number(
          configService.get<string>('MAX_FILE_SIZE') ?? 52_428_800,
        );

        return {
          storage: diskStorage({
            destination: (_req, _file, callback) => {
              mkdirSync(uploadPath, { recursive: true });
              callback(null, uploadPath);
            },
            filename: (_req, file, callback) => {
              const extension = extname(file.originalname);
              callback(null, `${Date.now()}-${randomUUID()}${extension}`);
            },
          }),
          limits: {
            fileSize: maxFileSize,
          },
        };
      },
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
