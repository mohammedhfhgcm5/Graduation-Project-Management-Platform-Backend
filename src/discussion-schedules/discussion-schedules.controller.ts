import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { Role } from '../generated/prisma/enums';
import { DiscussionSchedulesService } from './discussion-schedules.service';
import { CreateDiscussionScheduleDto } from './dto/create-discussion-schedule.dto';
import { ListDiscussionSchedulesDto } from './dto/list-discussion-schedules.dto';
import { UpdateDiscussionScheduleDto } from './dto/update-discussion-schedule.dto';

@Controller('discussion-schedules')
export class DiscussionSchedulesController {
  constructor(
    private readonly discussionSchedulesService: DiscussionSchedulesService,
  ) {}

  @Get()
  listSchedules(@Query() query: ListDiscussionSchedulesDto) {
    return this.discussionSchedulesService.listSchedules(query);
  }

  @Roles(Role.SUPERVISOR, Role.HEAD)
  @Post()
  createSchedule(
    @Body() dto: CreateDiscussionScheduleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.discussionSchedulesService.createSchedule(dto, user);
  }

  @Get(':id')
  getSchedule(@Param('id') scheduleId: string) {
    return this.discussionSchedulesService.getSchedule(scheduleId);
  }

  @Get(':id/pdf')
  async downloadSchedulePdf(
    @Param('id') scheduleId: string,
    @Res() response: Response,
  ) {
    const pdf = await this.discussionSchedulesService.createPdf(scheduleId);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="discussion-schedule-${scheduleId}.pdf"`,
    );
    response.end(pdf);
  }

  @Roles(Role.SUPERVISOR, Role.HEAD)
  @Patch(':id')
  updateSchedule(
    @Param('id') scheduleId: string,
    @Body() dto: UpdateDiscussionScheduleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.discussionSchedulesService.updateSchedule(
      scheduleId,
      dto,
      user,
    );
  }

  @Roles(Role.SUPERVISOR, Role.HEAD)
  @Delete(':id')
  deleteSchedule(
    @Param('id') scheduleId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.discussionSchedulesService.deleteSchedule(scheduleId, user);
  }
}
