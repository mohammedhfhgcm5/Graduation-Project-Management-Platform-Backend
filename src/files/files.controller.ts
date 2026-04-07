import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { UploadFileDto } from './dto/upload-file.dto';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload/:projectId')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadFileDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.filesService.uploadFile(projectId, file, dto, user);
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
