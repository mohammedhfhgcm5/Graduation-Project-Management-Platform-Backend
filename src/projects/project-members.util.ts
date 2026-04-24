import { ForbiddenException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';
import type { AuthUser } from '../common/interfaces/auth-user.interface';

export const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

export const projectMembersInclude = {
  students: {
    select: userSummarySelect,
  },
  supervisors: {
    select: userSummarySelect,
  },
} satisfies Prisma.ProjectInclude;

export const projectMemberIdsSelect = {
  students: {
    select: {
      id: true,
    },
  },
  supervisors: {
    select: {
      id: true,
    },
  },
} satisfies Prisma.ProjectSelect;

type ProjectMembers = {
  students: Array<{ id: string }>;
  supervisors: Array<{ id: string }>;
};

type ProjectParticipants<TStudent = unknown, TSupervisor = unknown> = {
  students: TStudent[];
  supervisors: TSupervisor[];
};

export function getProjectStudentIds(project: ProjectMembers) {
  return project.students.map((student) => student.id);
}

export function getProjectSupervisorIds(project: ProjectMembers) {
  return project.supervisors.map((supervisor) => supervisor.id);
}

export function hasProjectStudent(project: ProjectMembers, userId: string) {
  return getProjectStudentIds(project).includes(userId);
}

export function hasProjectSupervisor(project: ProjectMembers, userId: string) {
  return getProjectSupervisorIds(project).includes(userId);
}

export function assertProjectAccess(
  project: ProjectMembers,
  user: AuthUser,
  message = 'You are not allowed to access this project.',
) {
  if (user.role === Role.HEAD) {
    return;
  }

  if (user.role === Role.STUDENT && hasProjectStudent(project, user.sub)) {
    return;
  }

  if (
    user.role === Role.SUPERVISOR &&
    hasProjectSupervisor(project, user.sub)
  ) {
    return;
  }

  throw new ForbiddenException(message);
}

export function assertProjectEditor(
  project: ProjectMembers,
  user: AuthUser,
  message = 'You are not allowed to update this project.',
) {
  if (user.role === Role.STUDENT && hasProjectStudent(project, user.sub)) {
    return;
  }

  if (
    user.role === Role.SUPERVISOR &&
    hasProjectSupervisor(project, user.sub)
  ) {
    return;
  }

  throw new ForbiddenException(message);
}

export function formatProjectResponse<
  TStudent,
  TSupervisor,
  TProject extends ProjectParticipants<TStudent, TSupervisor>,
>(project: TProject) {
  return {
    ...project,
    student: project.students[0] ?? null,
    supervisor: project.supervisors[0] ?? null,
  };
}

export function formatProjectsResponse<
  TStudent,
  TSupervisor,
  TProject extends ProjectParticipants<TStudent, TSupervisor>,
>(projects: TProject[]) {
  return projects.map((project) => formatProjectResponse(project));
}
