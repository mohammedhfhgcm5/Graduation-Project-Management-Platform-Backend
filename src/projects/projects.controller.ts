import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { Role } from '../generated/prisma/enums';
import { AssignSupervisorDto } from './dto/assign-supervisor.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  listProjects(@CurrentUser() user: AuthUser, @Query() query: ListProjectsDto) {
    return this.projectsService.listProjects(user, query);
  }

  @Roles(Role.STUDENT)
  @Post()
  createProject(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthUser) {
    return this.projectsService.createProject(dto, user);
  }

  @Get(':id')
  getProjectById(
    @Param('id') projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.getProjectById(projectId, user);
  }

  @Roles(Role.STUDENT, Role.SUPERVISOR)
  @Patch(':id')
  updateProject(
    @Param('id') projectId: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.updateProject(projectId, dto, user);
  }

  @Roles(Role.HEAD, Role.SUPERVISOR)
  @Patch(':id/status')
  changeProjectStatus(
    @Param('id') projectId: string,
    @Body() dto: UpdateProjectStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.changeProjectStatus(projectId, dto, user);
  }

  @Roles(Role.HEAD)
  @Patch(':id/supervisor')
  assignSupervisor(
    @Param('id') projectId: string,
    @Body() dto: AssignSupervisorDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.assignSupervisor(projectId, dto, user);
  }

  @Roles(Role.HEAD)
  @Delete(':id')
  deleteProject(@Param('id') projectId: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.deleteProject(projectId, user);
  }
}
