import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { Prisma } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';
import {
  hasProjectSupervisor,
  projectMembersInclude,
  userSummarySelect,
} from '../projects/project-members.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDiscussionScheduleDto,
  CreateDiscussionScheduleItemDto,
} from './dto/create-discussion-schedule.dto';
import { ListDiscussionSchedulesDto } from './dto/list-discussion-schedules.dto';
import { UpdateDiscussionScheduleDto } from './dto/update-discussion-schedule.dto';
import { DiscussionSchedulePdfService } from './discussion-schedule-pdf.service';

const discussionScheduleInclude = {
  createdBy: {
    select: userSummarySelect,
  },
  items: {
    orderBy: [{ slotOrder: 'asc' }, { startsAt: 'asc' }],
    include: {
      project: {
        include: projectMembersInclude,
      },
    },
  },
} satisfies Prisma.DiscussionScheduleInclude;

type ProjectWithMembers = Prisma.ProjectGetPayload<{
  include: typeof projectMembersInclude;
}>;

type ScheduleForPdf = Prisma.DiscussionScheduleGetPayload<{
  include: typeof discussionScheduleInclude;
}>;

@Injectable()
export class DiscussionSchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: DiscussionSchedulePdfService,
  ) {}

  async listSchedules(query: ListDiscussionSchedulesDto) {
    const where: Prisma.DiscussionScheduleWhereInput = {};

    if (query.academicYear) {
      where.academicYear = query.academicYear;
    }

    if (query.semester) {
      where.semester = query.semester;
    }

    if (query.date) {
      where.discussionDate = this.createDayRange(query.date);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    return this.prisma.discussionSchedule.findMany({
      where,
      include: discussionScheduleInclude,
      orderBy: [{ discussionDate: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async getSchedule(scheduleId: string) {
    const schedule = await this.prisma.discussionSchedule.findUnique({
      where: { id: scheduleId },
      include: discussionScheduleInclude,
    });

    if (!schedule) {
      throw new NotFoundException('Discussion schedule not found.');
    }

    return schedule;
  }

  async createSchedule(dto: CreateDiscussionScheduleDto, user: AuthUser) {
    const items = await this.buildScheduleItems(dto.items, user);

    return this.prisma.discussionSchedule.create({
      data: {
        title: dto.title ?? this.createDefaultTitle(dto),
        academicYear: dto.academicYear,
        semester: dto.semester,
        discussionDate: new Date(dto.discussionDate),
        department: dto.department,
        location: dto.location,
        chairName: dto.chairName,
        createdById: user.sub,
        items: {
          create: items,
        },
      },
      include: discussionScheduleInclude,
    });
  }

  async updateSchedule(
    scheduleId: string,
    dto: UpdateDiscussionScheduleDto,
    user: AuthUser,
  ) {
    const schedule = await this.getScheduleForEditing(scheduleId, user);
    const items = dto.items
      ? await this.buildScheduleItems(dto.items, user)
      : undefined;

    return this.prisma.$transaction(async (tx) => {
      if (items) {
        await tx.discussionScheduleItem.deleteMany({
          where: { scheduleId: schedule.id },
        });
      }

      return tx.discussionSchedule.update({
        where: { id: schedule.id },
        data: {
          title: dto.title,
          academicYear: dto.academicYear,
          semester: dto.semester,
          discussionDate: dto.discussionDate
            ? new Date(dto.discussionDate)
            : undefined,
          department: dto.department,
          location: dto.location,
          chairName: dto.chairName,
          items: items
            ? {
                create: items,
              }
            : undefined,
        },
        include: discussionScheduleInclude,
      });
    });
  }

  async deleteSchedule(scheduleId: string, user: AuthUser) {
    const schedule = await this.getScheduleForEditing(scheduleId, user);

    await this.prisma.discussionSchedule.delete({
      where: { id: schedule.id },
    });

    return { message: 'Discussion schedule deleted successfully.' };
  }

  async createPdf(scheduleId: string) {
    const schedule = await this.getSchedule(scheduleId);
    return this.pdfService.createSchedulePdf(schedule as ScheduleForPdf);
  }

  private async getScheduleForEditing(scheduleId: string, user: AuthUser) {
    const schedule = await this.prisma.discussionSchedule.findUnique({
      where: { id: scheduleId },
      select: {
        id: true,
        createdById: true,
      },
    });

    if (!schedule) {
      throw new NotFoundException('Discussion schedule not found.');
    }

    if (user.role === Role.HEAD || schedule.createdById === user.sub) {
      return schedule;
    }

    throw new ForbiddenException(
      'You can update only discussion schedules that you created.',
    );
  }

  private async buildScheduleItems(
    items: CreateDiscussionScheduleItemDto[],
    user: AuthUser,
  ): Promise<Prisma.DiscussionScheduleItemCreateWithoutScheduleInput[]> {
    const projectsById = await this.getProjectsById(items, user);
    const usedOrders = new Set<number>();

    return items.map((item, index) => {
      const project = item.projectId
        ? projectsById.get(item.projectId)
        : undefined;
      const startsAt = new Date(item.startsAt);
      const endsAt = new Date(item.endsAt);

      if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
        throw new BadRequestException('Invalid discussion time.');
      }

      if (startsAt >= endsAt) {
        throw new BadRequestException(
          'Discussion end time must be after start time.',
        );
      }

      const slotOrder = item.slotOrder ?? index + 1;
      if (usedOrders.has(slotOrder)) {
        throw new BadRequestException('Discussion slot orders must be unique.');
      }
      usedOrders.add(slotOrder);

      const projectTitle = item.projectTitle ?? project?.title;
      if (!projectTitle) {
        throw new BadRequestException(
          'Each discussion item must include projectId or projectTitle.',
        );
      }

      const studentNames = this.normalizeNames(
        item.studentNames ?? project?.students.map((student) => student.name),
        'studentNames',
      );
      const supervisorNames = this.normalizeNames(
        item.supervisorNames ??
          project?.supervisors.map((supervisor) => supervisor.name),
        'supervisorNames',
      );

      return {
        project: project
          ? {
              connect: { id: project.id },
            }
          : undefined,
        slotOrder,
        projectTitle,
        studentNames,
        supervisorNames,
        committeeNames: this.normalizeNames(
          item.committeeNames,
          'committeeNames',
        ),
        startsAt,
        endsAt,
        room: item.room,
        notes: item.notes,
      };
    });
  }

  private async getProjectsById(
    items: CreateDiscussionScheduleItemDto[],
    user: AuthUser,
  ) {
    const projectIds = [
      ...new Set(items.map((item) => item.projectId).filter(Boolean)),
    ] as string[];

    if (projectIds.length === 0) {
      return new Map<string, ProjectWithMembers>();
    }

    const projects = await this.prisma.project.findMany({
      where: {
        id: {
          in: projectIds,
        },
      },
      include: projectMembersInclude,
    });

    if (projects.length !== projectIds.length) {
      throw new NotFoundException('One or more projects were not found.');
    }

    if (user.role === Role.SUPERVISOR) {
      for (const project of projects) {
        if (!hasProjectSupervisor(project, user.sub)) {
          throw new ForbiddenException(
            'Supervisors can schedule discussions only for assigned projects.',
          );
        }
      }
    }

    return new Map(projects.map((project) => [project.id, project]));
  }

  private normalizeNames(value: string[] | undefined, field: string) {
    const names = [...new Set((value ?? []).map((name) => name.trim()))].filter(
      Boolean,
    );

    if (names.length === 0) {
      throw new BadRequestException(`${field} must contain at least one name.`);
    }

    return names;
  }

  private createDefaultTitle(dto: CreateDiscussionScheduleDto) {
    const semester = dto.semester ? ` - ${dto.semester}` : '';
    return `جدول مناقشات مشاريع التخرج ${dto.academicYear}${semester}`;
  }

  private createDayRange(dateValue: string): Prisma.DateTimeFilter {
    const start = new Date(dateValue);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('Invalid date filter.');
    }

    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    return {
      gte: start,
      lt: end,
    };
  }
}
