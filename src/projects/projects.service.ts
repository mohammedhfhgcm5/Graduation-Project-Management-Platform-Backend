import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import {
  ProjectStatus as PrismaProjectStatus,
  Role,
} from '../generated/prisma/enums';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssignSupervisorDto } from './dto/assign-supervisor.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import type { ProjectStatus as QueryProjectStatus } from './dto/projects-query.types';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import {
  assertProjectAccess,
  assertProjectEditor,
  formatProjectResponse,
  formatProjectsResponse,
  getProjectStudentIds,
  hasProjectSupervisor,
  projectMemberIdsSelect,
  projectMembersInclude,
} from './project-members.util';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listProjects(user: AuthUser, query: ListProjectsDto) {
    const where: Prisma.ProjectWhereInput = {};

    if (user.role === Role.STUDENT) {
      where.students = {
        some: {
          id: user.sub,
        },
      };
    } else if (user.role === Role.SUPERVISOR) {
      where.supervisors = {
        some: {
          id: user.sub,
        },
      };
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

    const projects = await this.prisma.project.findMany({
      where,
      include: projectMembersInclude,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    return formatProjectsResponse(projects);
  }

  async createProject(dto: CreateProjectDto, user: AuthUser) {
    if (user.role !== Role.STUDENT) {
      throw new ForbiddenException('Only students can create projects.');
    }

    const studentIds = this.normalizeStudentIds(dto, user);
    await this.ensureUsersHaveRole(studentIds, Role.STUDENT, 'students');

    const project = await this.prisma.project.create({
      data: {
        title: dto.title,
        description: dto.description,
        progress: dto.progress ?? 0,
        techStack: dto.techStack,
        students: {
          connect: studentIds.map((id) => ({ id })),
        },
      },
      include: projectMembersInclude,
    });

    return formatProjectResponse(project);
  }

  async getProjectById(projectId: string, user: AuthUser) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        ...projectMembersInclude,
        files: {
          orderBy: { uploadedAt: 'desc' },
        },
        progressReports: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                department: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                department: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        meetings: {
          include: {
            scheduledBy: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                department: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { scheduledAt: 'desc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    assertProjectAccess(project, user);
    return formatProjectResponse(project);
  }

  async updateProject(
    projectId: string,
    dto: UpdateProjectDto,
    user: AuthUser,
  ) {
    const project = await this.ensureProjectExists(projectId);
    assertProjectEditor(project, user);

    const updatedProject = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        title: dto.title,
        description: dto.description,
        progress: dto.progress,
      },
      include: projectMembersInclude,
    });

    return formatProjectResponse(updatedProject);
  }

  async changeProjectStatus(
    projectId: string,
    dto: UpdateProjectStatusDto,
    user: AuthUser,
  ) {
    const project = await this.ensureProjectExists(projectId);

    if (user.role === Role.SUPERVISOR && !hasProjectSupervisor(project, user.sub)) {
      throw new ForbiddenException(
        'You can update status only for your projects.',
      );
    }

    const updatedProject = await this.prisma.project.update({
      where: { id: projectId },
      data: { status: dto.status },
      include: projectMembersInclude,
    });

    if (project.status !== dto.status) {
      await Promise.all(
        getProjectStudentIds(project).map((studentId) =>
          this.notificationsService.createForUser(
            studentId,
            `Project "${project.title}" status changed to ${dto.status}.`,
            `/projects/${project.id}`,
          ),
        ),
      );
    }

    return formatProjectResponse(updatedProject);
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
    const supervisorIds = this.normalizeSupervisorIds(dto.supervisorIds);
    const supervisors = await this.ensureUsersHaveRole(
      supervisorIds,
      Role.SUPERVISOR,
      'supervisors',
    );

    const updatedProject = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        supervisors: {
          set: supervisorIds.map((id) => ({ id })),
        },
        status:
          project.status === PrismaProjectStatus.PENDING_APPROVAL
            ? PrismaProjectStatus.APPROVED
            : undefined,
      },
      include: projectMembersInclude,
    });

    const supervisorNames = supervisors.map((supervisor) => supervisor.name);
    const assignedLabel =
      supervisorNames.length === 1 ? 'Supervisor' : 'Supervisors';
    const assignedVerb = supervisorNames.length === 1 ? 'was' : 'were';

    await Promise.all(
      getProjectStudentIds(project).map((studentId) =>
        this.notificationsService.createForUser(
          studentId,
          `${assignedLabel} ${supervisorNames.join(', ')} ${assignedVerb} assigned to your project "${project.title}".`,
          `/projects/${project.id}`,
        ),
      ),
    );

    return formatProjectResponse(updatedProject);
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

  private mapQueryStatusToDbStatus(
    status: QueryProjectStatus,
  ): PrismaProjectStatus {
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

  private normalizeStudentIds(dto: CreateProjectDto, user: AuthUser) {
    const studentIds = [...new Set([user.sub, ...(dto.studentIds ?? [])])];

    if (studentIds.length < 1 || studentIds.length > 3) {
      throw new BadRequestException(
        'A project must have between 1 and 3 students.',
      );
    }

    return studentIds;
  }

  private normalizeSupervisorIds(supervisorIds: string[]) {
    const uniqueSupervisorIds = [...new Set(supervisorIds)];

    if (
      uniqueSupervisorIds.length < 1 ||
      uniqueSupervisorIds.length > 3
    ) {
      throw new BadRequestException(
        'A project must have between 1 and 3 supervisors.',
      );
    }

    return uniqueSupervisorIds;
  }

  private async ensureUsersHaveRole(
    userIds: string[],
    role: Role,
    label: string,
  ) {
    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
        role,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (users.length !== userIds.length) {
      throw new NotFoundException(`One or more ${label} were not found.`);
    }

    const usersById = new Map(users.map((user) => [user.id, user]));
    return userIds.map((userId) => usersById.get(userId)!);
  }

  private async ensureProjectExists(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        status: true,
        ...projectMemberIdsSelect,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    return project;
  }
}
