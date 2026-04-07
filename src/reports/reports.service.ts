import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { Role } from '../generated/prisma/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  avatarUrl: true,
} as const;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createReport(projectId: string, dto: CreateReportDto, user: AuthUser) {
    const project = await this.ensureProjectExists(projectId);

    if (user.role !== Role.STUDENT || project.studentId !== user.sub) {
      throw new ForbiddenException(
        'Only the project owner can add progress reports.',
      );
    }

    const report = await this.prisma.progressReport.create({
      data: {
        projectId,
        authorId: user.sub,
        content: dto.content,
        weekNumber: dto.weekNumber,
      },
      include: {
        author: { select: userSummarySelect },
      },
    });

    if (project.supervisorId) {
      await this.notificationsService.createForUser(
        project.supervisorId,
        `A new progress report was uploaded for project "${project.title}".`,
        `/projects/${project.id}`,
      );
    }

    return report;
  }

  async listReports(projectId: string, user: AuthUser) {
    const project = await this.ensureProjectExists(projectId);
    this.assertProjectAccess(project.studentId, project.supervisorId, user);

    return this.prisma.progressReport.findMany({
      where: { projectId },
      include: {
        author: { select: userSummarySelect },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async ensureProjectExists(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        studentId: true,
        supervisorId: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    return project;
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

    throw new ForbiddenException(
      'You are not allowed to access reports for this project.',
    );
  }
}
