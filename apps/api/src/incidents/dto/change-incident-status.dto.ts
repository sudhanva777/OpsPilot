import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { IncidentStatus } from '../../common/types/enums.js';

export class ChangeIncidentStatusDto {
  @IsEnum(IncidentStatus, {
    message: `Status must be one of: ${Object.values(IncidentStatus).join(', ')}`,
  })
  status: IncidentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
