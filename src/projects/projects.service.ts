import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { ProjectStatus as PrismaProjectStatus, Role } from '../generated/prisma/enums';
import type { ProjectStatus as QueryProjectStatus } from './dto/projects-query.types';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssignSupervisorDto } from './dto/assign-supervisor.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  avatarUrl: true,
} as const;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listProjects(user: AuthUser, query: ListProjectsDto) {
    const where: Prisma.ProjectWhereInput = {};

    if (user.role === Role.STUDENT) {
      where.studentId = user.sub;
    } else if (user.role === Role.SUPERVISOR) {
      where.supervisorId = user.sub;
    }

    if (query.status) {
      where.status = this.mapQueryStatusToDbStatus(query.status);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    if (query.search) {
      where.OR = [
        {
          title: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    return this.prisma.project.findMany({
      where,
      include: {
        student: {
          select: userSummarySelect,
        },
        supervisor: {
          select: userSummarySelect,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });
  }

  async createProject(dto: CreateProjectDto, user: AuthUser) {
    if (user.role !== Role.STUDENT) {
      throw new ForbiddenException('Only students can create projects.');
    }

    return this.prisma.project.create({
      data: {
        title: dto.title,
        description: dto.description,
        progress: dto.progress ?? 0,
        techStack: dto.techStack,
        studentId: user.sub,
      },
      include: {
        student: { select: userSummarySelect },
        supervisor: { select: userSummarySelect },
      },
    });
  }

  async getProjectById(projectId: string, user: AuthUser) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        student: { select: userSummarySelect },
        supervisor: { select: userSummarySelect },
        files: {
          orderBy: { uploadedAt: 'desc' },
        },
        progressReports: {
          include: {
            author: { select: userSummarySelect },
          },
          orderBy: { createdAt: 'desc' },
        },
        comments: {
          include: {
            author: { select: userSummarySelect },
          },
          orderBy: { createdAt: 'desc' },
        },
        meetings: {
          include: {
            scheduledBy: { select: userSummarySelect },
          },
          orderBy: { scheduledAt: 'desc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    this.assertProjectAccess(project.studentId, project.supervisorId, user);
    return project;
  }

  async updateProject(
    projectId: string,
    dto: UpdateProjectDto,
    user: AuthUser,
  ) {
    const project = await this.ensureProjectExists(projectId);
    this.assertCanEditProject(project.studentId, project.supervisorId, user);

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        title: dto.title,
        description: dto.description,
        progress: dto.progress,
      },
      include: {
        student: { select: userSummarySelect },
        supervisor: { select: userSummarySelect },
      },
    });
  }

  async changeProjectStatus(
    projectId: string,
    dto: UpdateProjectStatusDto,
    user: AuthUser,
  ) {
    const project = await this.ensureProjectExists(projectId);

    if (user.role === Role.SUPERVISOR && project.supervisorId !== user.sub) {
      throw new ForbiddenException(
        'You can update status only for your projects.',
      );
    }

    const updatedProject = await this.prisma.project.update({
      where: { id: projectId },
      data: { status: dto.status },
      include: {
        student: { select: userSummarySelect },
        supervisor: { select: userSummarySelect },
      },
    });

    if (project.status !== dto.status) {
      await this.notificationsService.createForUser(
        project.studentId,
        `Project "${project.title}" status changed to ${dto.status}.`,
        `/projects/${project.id}`,
      );
    }

    return updatedProject;
  }

  async assignSupervisor(
    projectId: string,
    dto: AssignSupervisorDto,
    user: AuthUser,
  ) {
    if (user.role !== Role.HEAD) {
      throw new ForbiddenException(
        'Only department heads can assign supervisors.',
      );
    }

    const project = await this.ensureProjectExists(projectId);

    const supervisor = await this.prisma.user.findUnique({
      where: { id: dto.supervisorId },
      select: {
        id: true,
        role: true,
        name: true,
      },
    });

    if (!supervisor || supervisor.role !== Role.SUPERVISOR) {
      throw new NotFoundException('Supervisor not found.');
    }

    const updatedProject = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        supervisorId: dto.supervisorId,
        status:
          project.status === PrismaProjectStatus.PENDING_APPROVAL
            ? PrismaProjectStatus.APPROVED
            : undefined,
      },
      include: {
        student: { select: userSummarySelect },
        supervisor: { select: userSummarySelect },
      },
    });

    await this.notificationsService.createForUser(
      project.studentId,
      `Supervisor "${supervisor.name}" was assigned to your project "${project.title}".`,
      `/projects/${project.id}`,
    );

    return updatedProject;
  }

  async deleteProject(projectId: string, user: AuthUser) {
    if (user.role !== Role.HEAD) {
      throw new ForbiddenException(
        'Only department heads can delete projects.',
      );
    }

    await this.ensureProjectExists(projectId);
    await this.prisma.project.delete({ where: { id: projectId } });

    return { message: 'Project deleted successfully.' };
  }

  private mapQueryStatusToDbStatus(status: QueryProjectStatus): PrismaProjectStatus {
    switch (status) {
      case 'DRAFT':
      case 'SUBMITTED':
        return PrismaProjectStatus.PENDING_APPROVAL;
      case 'UNDER_REVIEW':
        return PrismaProjectStatus.UNDER_REVIEW;
      case 'APPROVED':
        return PrismaProjectStatus.APPROVED;
      case 'REJECTED':
        return PrismaProjectStatus.REJECTED;
      case 'ARCHIVED':
        return PrismaProjectStatus.COMPLETED;
    }
  }

  private assertProjectAccess(
    studentId: string,
    supervisorId: string | null,
    user: AuthUser,
  ) {
    if (user.role === Role.HEAD) {
      return;
    }

    if (user.role === Role.STUDENT && studentId === user.sub) {
      return;
    }

    if (user.role === Role.SUPERVISOR && supervisorId === user.sub) {
      return;
    }

    throw new ForbiddenException('You are not allowed to access this project.');
  }

  private assertCanEditProject(
    studentId: string,
    supervisorId: string | null,
    user: AuthUser,
  ) {
    if (user.role === Role.STUDENT && studentId === user.sub) {
      return;
    }

    if (user.role === Role.SUPERVISOR && supervisorId === user.sub) {
      return;
    }

    throw new ForbiddenException('You are not allowed to update this project.');
  }

  private async ensureProjectExists(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        status: true,
        studentId: true,
        supervisorId: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    return project;
  }
}

