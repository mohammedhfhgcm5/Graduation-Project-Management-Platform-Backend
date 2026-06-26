import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
