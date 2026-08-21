import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { IdeasController } from './ideas.controller';
import { IdeasService } from './ideas.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [IdeasController],
  providers: [IdeasService],
})
export class IdeasModule {}
