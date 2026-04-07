import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { FileType, Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { UploadFileDto } from './dto/upload-file.dto';

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  async uploadFile(
    projectId: string,
    file: Express.Multer.File | undefined,
    dto: UploadFileDto,
    user: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('File is required.');
    }

    await this.ensureProjectAccess(projectId, user);

    return this.prisma.projectFile.create({
      data: {
        projectId,
        type: dto.type ?? FileType.OTHER,
        filename: file.originalname,
        size: file.size,
        url: file.path.replaceAll('\\', '/'),
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  async listFiles(projectId: string, user: AuthUser) {
    await this.ensureProjectAccess(projectId, user);

    return this.prisma.projectFile.findMany({
      where: { projectId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async deleteFile(fileId: string, user: AuthUser) {
    const file = await this.prisma.projectFile.findUnique({
      where: { id: fileId },
      include: {
        project: {
          select: {
            id: true,
            studentId: true,
            supervisorId: true,
          },
        },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found.');
    }

    this.assertAccess(file.project.studentId, file.project.supervisorId, user);

    await this.prisma.projectFile.delete({
      where: { id: fileId },
    });

    try {
      await unlink(file.url);
    } catch (error: unknown) {
      const isMissing = (error as { code?: string }).code === 'ENOENT';
      if (!isMissing) {
        throw error;
      }
    }

    return { message: 'File deleted successfully.' };
  }

  private async ensureProjectAccess(projectId: string, user: AuthUser) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        studentId: true,
        supervisorId: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    this.assertAccess(project.studentId, project.supervisorId, user);
    return project;
  }

  private assertAccess(
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
      'You are not allowed to access this project files.',
    );
  }
}
