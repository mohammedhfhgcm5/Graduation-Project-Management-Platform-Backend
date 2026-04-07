import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateMeetingDto {
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
