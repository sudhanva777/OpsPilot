import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { IncidentSeverity } from '../../common/types/enums.js';

export class CreateIncidentDto {
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters.' })
  @MaxLength(255, { message: 'Title must not exceed 255 characters.' })
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Description must not exceed 5000 characters.' })
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Service name must not exceed 100 characters.' })
  service?: string;

  @IsEnum(IncidentSeverity, {
    message: `Severity must be one of: ${Object.values(IncidentSeverity).join(', ')}`,
  })
  severity: IncidentSeverity;

  @IsOptional()
  @IsUUID('4', { message: 'assignedToId must be a valid UUID.' })
  assignedToId?: string;
}
