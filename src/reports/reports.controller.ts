import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { Role } from '../generated/prisma/enums';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(Role.STUDENT)
  @Post(':projectId')
  createReport(
    @Param('projectId') projectId: string,
    @Body() dto: CreateReportDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reportsService.createReport(projectId, dto, user);
  }

  @Get(':projectId')
  listReports(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reportsService.listReports(projectId, user);
  }
}
