import { IsEnum, IsOptional } from 'class-validator';
import { FileType } from '../../generated/prisma/enums';

export class UploadFileDto {
  @IsOptional()
  @IsEnum(FileType)
  type?: FileType;
}
