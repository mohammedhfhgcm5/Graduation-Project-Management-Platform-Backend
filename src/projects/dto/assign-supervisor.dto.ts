import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class AssignSupervisorDto {
  @IsOptional()
  @IsUUID()
  supervisorId?: string;

  @Transform(({ value, obj }) => {
    const values = [
      ...(Array.isArray(value) ? value : value ? [value] : []),
      ...(obj.supervisorId ? [obj.supervisorId] : []),
    ];

    return [...new Set(values)];
  })
  @IsArray()
  @ArrayUnique()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsUUID('4', { each: true })
  supervisorIds!: string[];
}
