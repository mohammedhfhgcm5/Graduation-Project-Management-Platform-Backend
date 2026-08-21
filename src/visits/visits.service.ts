import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { Role } from '../generated/prisma/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertProjectAccess,
  hasProjectStudent,
  hasProjectSupervisor,
  projectMemberIdsSelect,
  userSummarySelect,
} from '../projects/project-members.util';
import { CreateVisitDto, UpdateVisitDto } from './dto/visit.dto';

@Injectable()
export class VisitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listVisits(projectId: string, user: AuthUser) {
    const project = await this.ensureProjectExists(projectId);
    assertProjectAccess(
      project,
      user,
      'You are not allowed to access visits for this project.',
    );

    return this.prisma.visit.findMany({
      where: { projectId },
      include: {
        student: { select: userSummarySelect },
        supervisor: { select: userSummarySelect },
      },
      orderBy: { visitedAt: 'desc' },
    });
  }

  async createVisit(projectId: string, dto: CreateVisitDto, user: AuthUser) {
    const project = await this.ensureProjectExists(projectId);
    this.assertCanRecordVisit(project, user);

    if (!hasProjectStudent(project, dto.studentId)) {
      throw new BadRequestException(
        'The selected student is not a member of this project.',
      );
    }

    const visit = await this.prisma.visit.create({
      data: {
        projectId,
        studentId: dto.studentId,
        supervisorId: user.sub,
        visitedAt: new Date(dto.visitedAt),
        summary: dto.summary,
        evaluation: dto.evaluation,
        rating: dto.rating,
      },
      include: {
        student: { select: userSummarySelect },
        supervisor: { select: userSummarySelect },
      },
    });

    await this.notificationsService.createForUser(
      dto.studentId,
      `A new visit was recorded for project "${project.title}".`,
      `/projects/${project.id}`,
    );

    return visit;
  }

  async updateVisit(visitId: string, dto: UpdateVisitDto, user: AuthUser) {
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            ...projectMemberIdsSelect,
          },
        },
      },
    });

    if (!visit) {
      throw new NotFoundException('Visit not found.');
    }

    this.assertCanManageVisit(visit, user);

    if (dto.studentId && !hasProjectStudent(visit.project, dto.studentId)) {
      throw new BadRequestException(
        'The selected student is not a member of this project.',
      );
    }

    return this.prisma.visit.update({
      where: { id: visitId },
      data: {
        studentId: dto.studentId,
        visitedAt: dto.visitedAt ? new Date(dto.visitedAt) : undefined,
        summary: dto.summary,
        evaluation: dto.evaluation,
        rating: dto.rating,
      },
      include: {
        student: { select: userSummarySelect },
        supervisor: { select: userSummarySelect },
      },
    });
  }

  async deleteVisit(visitId: string, user: AuthUser) {
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            ...projectMemberIdsSelect,
          },
        },
      },
    });

    if (!visit) {
      throw new NotFoundException('Visit not found.');
    }

    this.assertCanManageVisit(visit, user);

    await this.prisma.visit.delete({ where: { id: visitId } });
    return { message: 'Visit deleted successfully.' };
  }

  private assertCanRecordVisit(
    project: { students: Array<{ id: string }>; supervisors: Array<{ id: string }> },
    user: AuthUser,
  ) {
    if (user.role === Role.HEAD) {
      return;
    }

    if (user.role === Role.SUPERVISOR && hasProjectSupervisor(project, user.sub)) {
      return;
    }

    throw new ForbiddenException(
      'Only assigned supervisors or the department head can record visits.',
    );
  }

  private assertCanManageVisit(
    visit: { supervisorId: string; project: { supervisors: Array<{ id: string }> } },
    user: AuthUser,
  ) {
    if (user.role === Role.HEAD) {
      return;
    }

    if (visit.supervisorId === user.sub) {
      return;
    }

    throw new ForbiddenException('You can manage only visits you recorded.');
  }

  private async ensureProjectExists(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        ...projectMemberIdsSelect,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    return project;
  }
}
