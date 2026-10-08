import { IsOptional, IsObject } from 'class-validator';

export class StartInvestigationDto {
  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}
