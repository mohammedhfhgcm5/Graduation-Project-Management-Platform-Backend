import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { VisitRating } from '../../generated/prisma/enums';

export class CreateVisitDto {
  @IsUUID()
  studentId!: string;

  @IsDateString()
  visitedAt!: string;

  @IsString()
  @MinLength(3)
  summary!: string;

  @IsString()
  @MinLength(3)
  evaluation!: string;

  @IsEnum(VisitRating)
  rating!: VisitRating;
}

export class UpdateVisitDto {
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsOptional()
  @IsDateString()
  visitedAt?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  summary?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  evaluation?: string;

  @IsOptional()
  @IsEnum(VisitRating)
  rating?: VisitRating;
}
