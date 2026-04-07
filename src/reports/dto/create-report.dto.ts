import { IsInt, IsString, Min } from 'class-validator';

export class CreateReportDto {
  @IsString()
  content!: string;

  @IsInt()
  @Min(1)
  weekNumber!: number;
}
