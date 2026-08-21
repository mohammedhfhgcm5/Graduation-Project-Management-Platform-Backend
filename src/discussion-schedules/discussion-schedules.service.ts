import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { Prisma } from '../generated/prisma/client';
import { Role, ScheduleType } from '../generated/prisma/enums';
import { NotificationsService } from '../notifications/notifications.service';
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
import { SuggestDiscussionScheduleDto } from './dto/suggest-discussion-schedule.dto';
import { UpdateDiscussionScheduleDto } from './dto/update-discussion-schedule.dto';
import { DiscussionSchedulePdfService } from './discussion-schedule-pdf.service';

const discussionScheduleInclude = {
  createdBy: {
    select: userSummarySelect,
  },
  items: {
    orderBy: [{ slotOrder: 'asc' as const }, { startsAt: 'asc' as const }],
    include: {
      project: {
        include: projectMembersInclude,
      },
      committeeMembers: {
        include: {
          user: { select: userSummarySelect },
        },
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

type BuiltItem = {
  projectId?: string;
  slotOrder: number;
  projectTitle: string;
  studentNames: string[];
  supervisorNames: string[];
  committeeNames: string[];
  committeeMemberIds: string[];
  startsAt: Date;
  endsAt: Date;
  room?: string;
  notes?: string;
};

@Injectable()
export class DiscussionSchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: DiscussionSchedulePdfService,
    private readonly notificationsService: NotificationsService,
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

    if (query.type) {
      where.type = query.type;
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

  async listMySchedules(user: AuthUser) {
    if (user.role !== Role.STUDENT) {
      return this.listSchedules({ page: 1, limit: 50 });
    }

    return this.prisma.discussionSchedule.findMany({
      where: {
        items: {
          some: {
            project: {
              students: {
                some: { id: user.sub },
              },
            },
          },
        },
      },
      include: discussionScheduleInclude,
      orderBy: [{ discussionDate: 'asc' }, { createdAt: 'desc' }],
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
    this.assertNoCommitteeConflicts(items);

    const schedule = await this.prisma.discussionSchedule.create({
      data: {
        title: dto.title ?? this.createDefaultTitle(dto),
        type: dto.type ?? ScheduleType.FINAL_DISCUSSION,
        academicYear: dto.academicYear,
        semester: dto.semester,
        discussionDate: new Date(dto.discussionDate),
        department: dto.department,
        location: dto.location,
        chairName: dto.chairName,
        createdById: user.sub,
        items: {
          create: items.map((item) => ({
            project: item.projectId
              ? { connect: { id: item.projectId } }
              : undefined,
            slotOrder: item.slotOrder,
            projectTitle: item.projectTitle,
            studentNames: item.studentNames,
            supervisorNames: item.supervisorNames,
            committeeNames: item.committeeNames,
            startsAt: item.startsAt,
            endsAt: item.endsAt,
            room: item.room,
            notes: item.notes,
            committeeMembers: {
              create: item.committeeMemberIds.map((userId) => ({ userId })),
            },
          })),
        },
      },
      include: discussionScheduleInclude,
    });

    await this.notifyStudentsForSchedule(schedule);
    return schedule;
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

    if (items) {
      this.assertNoCommitteeConflicts(items);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (items) {
        await tx.discussionScheduleItem.deleteMany({
          where: { scheduleId: schedule.id },
        });
      }

      return tx.discussionSchedule.update({
        where: { id: schedule.id },
        data: {
          title: dto.title,
          type: dto.type,
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
                create: items.map((item) => ({
                  project: item.projectId
                    ? { connect: { id: item.projectId } }
                    : undefined,
                  slotOrder: item.slotOrder,
                  projectTitle: item.projectTitle,
                  studentNames: item.studentNames,
                  supervisorNames: item.supervisorNames,
                  committeeNames: item.committeeNames,
                  startsAt: item.startsAt,
                  endsAt: item.endsAt,
                  room: item.room,
                  notes: item.notes,
                  committeeMembers: {
                    create: item.committeeMemberIds.map((userId) => ({
                      userId,
                    })),
                  },
                })),
              }
            : undefined,
        },
        include: discussionScheduleInclude,
      });
    });

    await this.notifyStudentsForSchedule(updated, true);
    return updated;
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

  async suggestSchedule(dto: SuggestDiscussionScheduleDto, user: AuthUser) {
    if (user.role !== Role.HEAD && user.role !== Role.SUPERVISOR) {
      throw new ForbiddenException(
        'Only supervisors and heads can suggest schedules.',
      );
    }

    const projects = await this.prisma.project.findMany({
      where: { id: { in: dto.projectIds } },
      include: projectMembersInclude,
    });

    if (projects.length !== dto.projectIds.length) {
      throw new NotFoundException('One or more projects were not found.');
    }

    for (const project of projects) {
      if (!project.committeeMembers.length) {
        throw new BadRequestException(
          `Project "${project.title}" has no discussion committee. Set the committee first.`,
        );
      }
    }

    const dayStart = this.parseTimeOnDate(dto.discussionDate, dto.dayStart);
    const dayEnd = this.parseTimeOnDate(dto.discussionDate, dto.dayEnd);
    if (dayStart >= dayEnd) {
      throw new BadRequestException('dayEnd must be after dayStart.');
    }

    const slotMs = dto.slotMinutes * 60_000;
    const breakMs = (dto.breakMinutes ?? 0) * 60_000;
    const rooms = dto.rooms?.filter(Boolean).length
      ? dto.rooms.filter(Boolean)
      : [undefined];

    const ranked = [...projects].sort((a, b) => {
      const aShare = this.countSharedMembers(a, projects);
      const bShare = this.countSharedMembers(b, projects);
      if (bShare !== aShare) return bShare - aShare;
      return b.committeeMembers.length - a.committeeMembers.length;
    });

    type Slot = {
      projectId: string;
      startsAt: Date;
      endsAt: Date;
      room?: string;
      memberIds: string[];
    };

    const placed: Slot[] = [];
    const unscheduled: Array<{ projectId: string; title: string; reason: string }> =
      [];

    for (const project of ranked) {
      const memberIds = project.committeeMembers.map((m) => m.userId);
      let placedSlot: Slot | null = null;

      for (
        let cursor = dayStart.getTime();
        cursor + slotMs <= dayEnd.getTime();
        cursor += slotMs + breakMs
      ) {
        const startsAt = new Date(cursor);
        const endsAt = new Date(cursor + slotMs);

        for (const room of rooms) {
          const memberConflict = placed.some(
            (slot) =>
              this.timesOverlap(startsAt, endsAt, slot.startsAt, slot.endsAt) &&
              memberIds.some((id) => slot.memberIds.includes(id)),
          );
          if (memberConflict) continue;

          const roomConflict =
            room &&
            placed.some(
              (slot) =>
                slot.room === room &&
                this.timesOverlap(startsAt, endsAt, slot.startsAt, slot.endsAt),
            );
          if (roomConflict) continue;

          placedSlot = {
            projectId: project.id,
            startsAt,
            endsAt,
            room,
            memberIds,
          };
          break;
        }

        if (placedSlot) break;
      }

      if (placedSlot) {
        placed.push(placedSlot);
      } else {
        unscheduled.push({
          projectId: project.id,
          title: project.title,
          reason: 'No available slot without committee time conflict.',
        });
      }
    }

    placed.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

    const items = placed.map((slot, index) => {
      const project = projects.find((p) => p.id === slot.projectId)!;
      const committeeNames = project.committeeMembers.map((m) => m.user.name);
      return {
        projectId: project.id,
        slotOrder: index + 1,
        projectTitle: project.title,
        studentNames: project.students.map((s) => s.name),
        supervisorNames: project.supervisors.map((s) => s.name),
        committeeNames,
        committeeMemberIds: project.committeeMembers.map((m) => m.userId),
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
        room: slot.room,
      };
    });

    return {
      title:
        dto.title ??
        this.createDefaultTitle({
          academicYear: dto.academicYear ?? '',
          semester: dto.semester,
          type: dto.type,
        }),
      type: dto.type ?? ScheduleType.FINAL_DISCUSSION,
      academicYear: dto.academicYear,
      semester: dto.semester,
      discussionDate: dto.discussionDate,
      department: dto.department,
      location: dto.location,
      chairName: dto.chairName,
      items,
      unscheduled,
    };
  }

  private countSharedMembers(
    project: ProjectWithMembers,
    all: ProjectWithMembers[],
  ) {
    const ids = new Set(project.committeeMembers.map((m) => m.userId));
    let score = 0;
    for (const other of all) {
      if (other.id === project.id) continue;
      for (const member of other.committeeMembers) {
        if (ids.has(member.userId)) score += 1;
      }
    }
    return score;
  }

  private timesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
    return aStart < bEnd && bStart < aEnd;
  }

  private parseTimeOnDate(dateValue: string, timeValue: string) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(timeValue.trim());
    if (!match) {
      throw new BadRequestException('Invalid time format. Use HH:mm.');
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) {
      throw new BadRequestException('Invalid time value.');
    }

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid discussion date.');
    }

    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  private assertNoCommitteeConflicts(items: BuiltItem[]) {
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i];
        const b = items[j];
        if (!this.timesOverlap(a.startsAt, a.endsAt, b.startsAt, b.endsAt)) {
          continue;
        }

        const shared = a.committeeMemberIds.filter((id) =>
          b.committeeMemberIds.includes(id),
        );
        if (shared.length === 0) continue;

        const sharedNames = [
          ...new Set(
            [...a.committeeNames, ...b.committeeNames].filter((name, idx, arr) => {
              // Prefer names from memberships that appear in both lists by id order
              return arr.indexOf(name) === idx;
            }),
          ),
        ];

        const overlappingNames = a.committeeNames.filter((name) =>
          b.committeeNames.includes(name),
        );

        throw new BadRequestException(
          `تعارض مواعيد اللجنة: ${overlappingNames.join(', ') || sharedNames.join(', ') || shared.join(', ')} بين "${a.projectTitle}" و"${b.projectTitle}".`,
        );
      }
    }
  }

  private async notifyStudentsForSchedule(
    schedule: ScheduleForPdf,
    isUpdate = false,
  ) {
    const typeLabel =
      schedule.type === ScheduleType.SEMINAR ? 'سيمنار' : 'مناقشة نهائية';
    const action = isUpdate ? 'تم تحديث' : 'تم تحديد';
    const studentIds = new Set<string>();

    for (const item of schedule.items) {
      for (const student of item.project?.students ?? []) {
        studentIds.add(student.id);
      }
    }

    await Promise.all(
      [...studentIds].map((studentId) =>
        this.notificationsService.createForUser(
          studentId,
          `${action} موعد ${typeLabel}: ${schedule.title}`,
          `/discussion-schedules`,
        ),
      ),
    );
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
  ): Promise<BuiltItem[]> {
    const projectsById = await this.getProjectsById(items, user);
    const usedOrders = new Set<number>();

    const built: BuiltItem[] = [];

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
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

      let committeeMemberIds = [
        ...new Set(item.committeeMemberIds ?? []),
      ];

      if (committeeMemberIds.length === 0 && project) {
        committeeMemberIds = project.committeeMembers.map((m) => m.userId);
      }

      let committeeNames = (item.committeeNames ?? []).map((n) => n.trim()).filter(Boolean);

      if (committeeNames.length === 0 && project?.committeeMembers.length) {
        committeeNames = project.committeeMembers.map((m) => m.user.name);
      }

      if (committeeMemberIds.length > 0) {
        const users = await this.prisma.user.findMany({
          where: {
            id: { in: committeeMemberIds },
            role: { in: [Role.SUPERVISOR, Role.HEAD] },
          },
          select: { id: true, name: true },
        });

        if (users.length !== committeeMemberIds.length) {
          throw new BadRequestException(
            'One or more committee members are invalid.',
          );
        }

        if (committeeNames.length === 0) {
          committeeNames = users.map((u) => u.name);
        }
      }

      if (committeeNames.length === 0) {
        throw new BadRequestException(
          'committeeNames or committeeMemberIds must contain at least one member.',
        );
      }

      built.push({
        projectId: project?.id,
        slotOrder,
        projectTitle,
        studentNames,
        supervisorNames,
        committeeNames: [...new Set(committeeNames)],
        committeeMemberIds,
        startsAt,
        endsAt,
        room: item.room,
        notes: item.notes,
      });
    }

    return built;
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

  private createDefaultTitle(dto: {
    academicYear: string;
    semester?: string;
    type?: ScheduleType;
  }) {
    const semester = dto.semester ? ` - ${dto.semester}` : '';
    const kind =
      dto.type === ScheduleType.SEMINAR
        ? 'جدول سيمنارات مشاريع التخرج'
        : 'جدول مناقشات مشاريع التخرج';
    return `${kind} ${dto.academicYear}${semester}`;
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
