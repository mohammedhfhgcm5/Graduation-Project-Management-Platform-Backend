import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import {
  assertProjectAccess,
  projectMemberIdsSelect,
} from '../projects/project-members.util';
import { PrismaService } from '../prisma/prisma.service';
import { UploadFileDto } from './dto/upload-file.dto';

type FileResponse = {
  id: string;
  projectId: string;
  type: UploadFileDto['type'];
  url: string;
  filename: string;
  size: number | null;
  uploadedAt: Date;
};

type CloudinaryDeleteMetadata = {
  cloudinaryPublicId: string | null;
  cloudinaryResourceType: string | null;
};

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async uploadFile(
    projectId: string,
    dto: UploadFileDto,
    user: AuthUser,
  ) {
    await this.ensureProjectAccess(projectId, user);

    const file = await this.prisma.projectFile.create({
      data: {
        projectId,
        type: dto.type,
        url: dto.url,
        filename: dto.filename,
        size: dto.size,
        provider: dto.provider ?? 'cloudinary',
        cloudinaryPublicId: dto.cloudinaryPublicId,
        cloudinaryResourceType: dto.cloudinaryResourceType,
        cloudinaryFormat: dto.cloudinaryFormat,
      },
    });

    return this.toFileResponse(file);
  }

  async listFiles(projectId: string, user: AuthUser) {
    await this.ensureProjectAccess(projectId, user);

    const files = await this.prisma.projectFile.findMany({
      where: { projectId },
      orderBy: { uploadedAt: 'desc' },
    });

    return files.map((file) => this.toFileResponse(file));
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

    await this.deleteCloudinaryFileIfConfigured(file);

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

  private toFileResponse(file: FileResponse) {
    return {
      id: file.id,
      projectId: file.projectId,
      type: file.type,
      url: file.url,
      filename: file.filename,
      size: file.size,
      uploadedAt: file.uploadedAt,
    };
  }

  private async deleteCloudinaryFileIfConfigured(
    file: CloudinaryDeleteMetadata,
  ) {
    const publicId = file.cloudinaryPublicId;
    if (!publicId) {
      return;
    }

    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      return;
    }

    try {
      const resourceType = file.cloudinaryResourceType || 'raw';
      const url = new URL(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(
          cloudName,
        )}/resources/${encodeURIComponent(resourceType)}/upload`,
      );
      url.searchParams.append('public_ids[]', publicId);

      const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString(
        'base64',
      );
      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(
          `Cloudinary delete failed with status ${response.status}: ${responseText}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to delete Cloudinary file ${publicId}: ${message}`);
    }
  }
}
