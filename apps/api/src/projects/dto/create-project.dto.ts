import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @MinLength(2, { message: 'Project name must be at least 2 characters.' })
  @MaxLength(100, { message: 'Project name must not exceed 100 characters.' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Slug must not exceed 100 characters.' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug may only contain lowercase letters, numbers, and hyphens.',
  })
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description must not exceed 1000 characters.' })
  description?: string;
}
