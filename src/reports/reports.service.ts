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
import {
  assertProjectAccess,
  getProjectSupervisorIds,
  hasProjectStudent,
  projectMemberIdsSelect,
  userSummarySelect,
} from '../projects/project-members.util';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createReport(projectId: string, dto: CreateReportDto, user: AuthUser) {
    const project = await this.ensureProjectExists(projectId);

    if (user.role !== Role.STUDENT || !hasProjectStudent(project, user.sub)) {
      throw new ForbiddenException(
        'Only students assigned to this project can add progress reports.',
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

    await Promise.all(
      getProjectSupervisorIds(project).map((supervisorId) =>
        this.notificationsService.createForUser(
          supervisorId,
          `A new progress report was uploaded for project "${project.title}".`,
          `/projects/${project.id}`,
        ),
      ),
    );

    return report;
  }

  async listReports(projectId: string, user: AuthUser) {
    const project = await this.ensureProjectExists(projectId);
    assertProjectAccess(
      project,
      user,
      'You are not allowed to access reports for this project.',
    );

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
        ...projectMemberIdsSelect,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    return project;
  }
}
