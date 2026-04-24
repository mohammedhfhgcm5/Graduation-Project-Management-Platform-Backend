import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProjectDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  techStack!: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @Transform(({ value, obj }) => {
    const values = [
      ...(Array.isArray(value) ? value : value ? [value] : []),
      ...(obj.studentId ? [obj.studentId] : []),
    ];

    return values.length > 0 ? [...new Set(values)] : undefined;
  })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(3)
  @IsUUID('4', { each: true })
  studentIds?: string[];
}
