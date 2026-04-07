import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateMeetingDto {
  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
