import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ScheduleType } from '../../generated/prisma/enums';

export class SuggestDiscussionScheduleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  projectIds!: string[];

  @IsDateString()
  discussionDate!: string;

  /** Time of day HH:mm, e.g. "09:00" */
  @IsString()
  dayStart!: string;

  /** Time of day HH:mm, e.g. "16:00" */
  @IsString()
  dayEnd!: string;

  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(180)
  slotMinutes!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  breakMinutes?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rooms?: string[];

  @IsOptional()
  @IsEnum(ScheduleType)
  type?: ScheduleType;

  @IsOptional()
  @IsString()
  academicYear?: string;

  @IsOptional()
  @IsString()
  semester?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  chairName?: string;

  @IsOptional()
  @IsString()
  title?: string;
}
