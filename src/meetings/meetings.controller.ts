import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { Role } from '../generated/prisma/enums';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { MeetingsService } from './meetings.service';

@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Roles(Role.SUPERVISOR)
  @Post(':projectId')
  scheduleMeeting(
    @Param('projectId') projectId: string,
    @Body() dto: CreateMeetingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.meetingsService.scheduleMeeting(projectId, dto, user);
  }

  @Get(':projectId')
  listMeetings(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.meetingsService.listMeetings(projectId, user);
  }

  @Roles(Role.SUPERVISOR)
  @Patch(':id')
  updateMeeting(
    @Param('id') meetingId: string,
    @Body() dto: UpdateMeetingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.meetingsService.updateMeeting(meetingId, dto, user);
  }
}
