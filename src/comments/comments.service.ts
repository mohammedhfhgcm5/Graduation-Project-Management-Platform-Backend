import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { Role } from '../generated/prisma/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  avatarUrl: true,
} as const;

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createComment(
    projectId: string,
    dto: CreateCommentDto,
    user: AuthUser,
  ) {
    const project = await this.ensureProjectExists(projectId);

    if (user.role === Role.SUPERVISOR && project.supervisorId !== user.sub) {
      throw new ForbiddenException(
        'You can add comments only to projects assigned to you.',
      );
    }

    if (user.role !== Role.SUPERVISOR && user.role !== Role.HEAD) {
      throw new ForbiddenException(
        'Only supervisors or department heads can add comments.',
      );
    }

    const comment = await this.prisma.comment.create({
      data: {
        projectId,
        authorId: user.sub,
        content: dto.content,
      },
      include: {
        author: { select: userSummarySelect },
      },
    });

    await this.notificationsService.createForUser(
      project.studentId,
      `A new comment was added to your project "${project.title}".`,
      `/projects/${project.id}`,
    );

    return comment;
  }

  async listComments(projectId: string, user: AuthUser) {
    const project = await this.ensureProjectExists(projectId);
    this.assertProjectAccess(project.studentId, project.supervisorId, user);

    return this.prisma.comment.findMany({
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
      'You are not allowed to access comments for this project.',
    );
  }
}
