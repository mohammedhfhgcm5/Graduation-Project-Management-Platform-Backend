import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { Role } from '../generated/prisma/enums';
import { CreateVisitDto, UpdateVisitDto } from './dto/visit.dto';
import { VisitsService } from './visits.service';

@Controller('visits')
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Get(':projectId')
  listVisits(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.visitsService.listVisits(projectId, user);
  }

  @Roles(Role.SUPERVISOR, Role.HEAD)
  @Post(':projectId')
  createVisit(
    @Param('projectId') projectId: string,
    @Body() dto: CreateVisitDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.visitsService.createVisit(projectId, dto, user);
  }

  @Roles(Role.SUPERVISOR, Role.HEAD)
  @Patch(':id')
  updateVisit(
    @Param('id') visitId: string,
    @Body() dto: UpdateVisitDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.visitsService.updateVisit(visitId, dto, user);
  }

  @Roles(Role.SUPERVISOR, Role.HEAD)
  @Delete(':id')
  deleteVisit(
    @Param('id') visitId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.visitsService.deleteVisit(visitId, user);
  }
}
