import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { IdeaStatus, Role } from '../generated/prisma/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  formatProjectResponse,
  projectMembersInclude,
  userSummarySelect,
} from '../projects/project-members.util';
import {
  ClaimIdeaDto,
  CreateIdeaDto,
  ListIdeasDto,
  UpdateIdeaDto,
} from './dto/idea.dto';

@Injectable()
export class IdeasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listIdeas(query: ListIdeasDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = {
      ...(query.status ? { status: query.status as IdeaStatus } : {}),
      ...(query.department ? { department: query.department } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.projectIdea.findMany({
        where,
        include: {
          proposedBy: { select: userSummarySelect },
          claimedByProject: {
            select: { id: true, title: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.projectIdea.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getIdea(ideaId: string) {
    const idea = await this.prisma.projectIdea.findUnique({
      where: { id: ideaId },
      include: {
        proposedBy: { select: userSummarySelect },
        claimedByProject: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    if (!idea) {
      throw new NotFoundException('Idea not found.');
    }

    return idea;
  }

  async createIdea(dto: CreateIdeaDto, user: AuthUser) {
    if (user.role !== Role.SUPERVISOR && user.role !== Role.HEAD) {
      throw new ForbiddenException('Only supervisors and heads can propose ideas.');
    }

    return this.prisma.projectIdea.create({
      data: {
        title: dto.title,
        description: dto.description,
        techStack: dto.techStack,
        department: dto.department,
        proposedById: user.sub,
      },
      include: {
        proposedBy: { select: userSummarySelect },
      },
    });
  }

  async updateIdea(ideaId: string, dto: UpdateIdeaDto, user: AuthUser) {
    const idea = await this.getIdea(ideaId);

    if (user.role !== Role.HEAD && idea.proposedById !== user.sub) {
      throw new ForbiddenException('You can update only your own ideas.');
    }

    if (idea.status === IdeaStatus.TAKEN && dto.status === 'AVAILABLE') {
      throw new BadRequestException('A taken idea cannot be made available again.');
    }

    return this.prisma.projectIdea.update({
      where: { id: ideaId },
      data: {
        title: dto.title,
        description: dto.description,
        techStack: dto.techStack,
        department: dto.department,
        status:
          dto.status === 'ARCHIVED'
            ? IdeaStatus.ARCHIVED
            : dto.status === 'AVAILABLE'
              ? IdeaStatus.AVAILABLE
              : undefined,
      },
      include: {
        proposedBy: { select: userSummarySelect },
        claimedByProject: {
          select: { id: true, title: true, status: true },
        },
      },
    });
  }

  async claimIdea(ideaId: string, dto: ClaimIdeaDto, user: AuthUser) {
    if (user.role !== Role.STUDENT) {
      throw new ForbiddenException('Only students can claim ideas.');
    }

    const idea = await this.prisma.projectIdea.findUnique({
      where: { id: ideaId },
      include: {
        proposedBy: { select: { id: true, name: true, role: true } },
      },
    });

    if (!idea) {
      throw new NotFoundException('Idea not found.');
    }

    if (idea.status !== IdeaStatus.AVAILABLE) {
      throw new BadRequestException('This idea is not available to claim.');
    }

    const studentIds = [...new Set([user.sub, ...(dto.studentIds ?? [])])];
    if (studentIds.length < 1 || studentIds.length > 3) {
      throw new BadRequestException('A project must have between 1 and 3 students.');
    }

    const students = await this.prisma.user.findMany({
      where: { id: { in: studentIds }, role: Role.STUDENT },
      select: { id: true },
    });

    if (students.length !== studentIds.length) {
      throw new NotFoundException('One or more students were not found.');
    }

    const supervisorConnect =
      idea.proposedBy.role === Role.SUPERVISOR
        ? { connect: [{ id: idea.proposedById }] }
        : undefined;

    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          title: idea.title,
          description: idea.description,
          techStack: idea.techStack,
          students: {
            connect: studentIds.map((id) => ({ id })),
          },
          supervisors: supervisorConnect,
        },
        include: projectMembersInclude,
      });

      const updated = await tx.projectIdea.updateMany({
        where: { id: ideaId, status: IdeaStatus.AVAILABLE },
        data: {
          status: IdeaStatus.TAKEN,
          claimedByProjectId: created.id,
        },
      });

      if (updated.count !== 1) {
        throw new BadRequestException('This idea was just claimed by someone else.');
      }

      return created;
    });

    await this.notificationsService.createForUser(
      idea.proposedById,
      `Your idea "${idea.title}" was claimed and turned into a project.`,
      `/projects/${project.id}`,
    );

    const heads = await this.prisma.user.findMany({
      where: { role: Role.HEAD },
      select: { id: true },
    });

    await Promise.all(
      heads.map((head) =>
        this.notificationsService.createForUser(
          head.id,
          `A new project "${idea.title}" was created from the ideas bank.`,
          `/projects/${project.id}`,
        ),
      ),
    );

    return formatProjectResponse(project);
  }
}
