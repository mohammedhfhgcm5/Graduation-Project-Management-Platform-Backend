import {
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
  getProjectStudentIds,
  hasProjectSupervisor,
  projectMemberIdsSelect,
  userSummarySelect,
} from '../projects/project-members.util';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async scheduleMeeting(
    projectId: string,
    dto: CreateMeetingDto,
    user: AuthUser,
  ) {
    const project = await this.ensureProjectExists(projectId);

    if (user.role !== Role.SUPERVISOR || !hasProjectSupervisor(project, user.sub)) {
      throw new ForbiddenException(
        'Only assigned supervisors can schedule meetings for this project.',
      );
    }

    const meeting = await this.prisma.meeting.create({
      data: {
        projectId,
        scheduledById: user.sub,
        scheduledAt: new Date(dto.scheduledAt),
        location: dto.location,
        notes: dto.notes,
      },
      include: {
        scheduledBy: { select: userSummarySelect },
      },
    });

    await Promise.all(
      getProjectStudentIds(project).map((studentId) =>
        this.notificationsService.createForUser(
          studentId,
          `A new meeting was scheduled for your project "${project.title}".`,
          `/projects/${project.id}`,
        ),
      ),
    );

    return meeting;
  }

  async listMeetings(projectId: string, user: AuthUser) {
    const project = await this.ensureProjectExists(projectId);
    assertProjectAccess(
      project,
      user,
      'You are not allowed to access meetings for this project.',
    );

    return this.prisma.meeting.findMany({
      where: { projectId },
      include: {
        scheduledBy: { select: userSummarySelect },
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async updateMeeting(
    meetingId: string,
    dto: UpdateMeetingDto,
    user: AuthUser,
  ) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        project: {
          select: {
            id: true,
            ...projectMemberIdsSelect,
          },
        },
      },
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found.');
    }

    if (
      user.role !== Role.SUPERVISOR ||
      !hasProjectSupervisor(meeting.project, user.sub)
    ) {
      throw new ForbiddenException(
        'Only assigned supervisors can update this meeting.',
      );
    }

    return this.prisma.meeting.update({
      where: { id: meetingId },
      data: {
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        location: dto.location,
        notes: dto.notes,
      },
      include: {
        scheduledBy: { select: userSummarySelect },
      },
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
