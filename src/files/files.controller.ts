import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { UploadFileDto } from './dto/upload-file.dto';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload/:projectId')
  uploadFile(
    @Param('projectId') projectId: string,
    @Body() dto: UploadFileDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.filesService.uploadFile(projectId, dto, user);
  }

  @Get(':projectId')
  listFiles(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.filesService.listFiles(projectId, user);
  }

  @Delete(':fileId')
  deleteFile(@Param('fileId') fileId: string, @CurrentUser() user: AuthUser) {
    return this.filesService.deleteFile(fileId, user);
  }
}
