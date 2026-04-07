import { Controller, Get, Param, Patch } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('me')
  getMyNotifications(@CurrentUser() user: AuthUser) {
    return this.notificationsService.getMyNotifications(user.sub);
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id') notificationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.notificationsService.markAsRead(notificationId, user.sub);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllAsRead(user.sub);
  }
}
