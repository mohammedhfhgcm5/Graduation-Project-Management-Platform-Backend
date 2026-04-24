import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { FileType } from '../generated/prisma/enums';
import {
  assertProjectAccess,
  projectMemberIdsSelect,
} from '../projects/project-members.util';
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
            ...projectMemberIdsSelect,
          },
        },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found.');
    }

    assertProjectAccess(
      file.project,
      user,
      'You are not allowed to access this project files.',
    );

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
        ...projectMemberIdsSelect,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    assertProjectAccess(project, user);
    return project;
  }
}
