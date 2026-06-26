import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { FileType } from '../../generated/prisma/enums';

export class UploadFileDto {
  @IsEnum(FileType)
  type!: FileType;

  @IsUrl()
  url!: string;

  @IsString()
  @IsNotEmpty()
  filename!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  size?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  provider?: string = 'cloudinary';

  @IsOptional()
  @IsString()
  cloudinaryPublicId?: string;

  @IsOptional()
  @IsString()
  cloudinaryResourceType?: string;

  @IsOptional()
  @IsString()
  cloudinaryFormat?: string;
}
