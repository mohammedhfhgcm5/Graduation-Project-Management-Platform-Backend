import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscussionSchedulePdfService } from './discussion-schedule-pdf.service';
import { DiscussionSchedulesController } from './discussion-schedules.controller';
import { DiscussionSchedulesService } from './discussion-schedules.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [DiscussionSchedulesController],
  providers: [DiscussionSchedulesService, DiscussionSchedulePdfService],
})
export class DiscussionSchedulesModule {}
