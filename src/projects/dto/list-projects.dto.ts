import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProjectStatus } from '../../generated/prisma/enums';

export class ListProjectsDto {
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsString()
  search?: string;
}
