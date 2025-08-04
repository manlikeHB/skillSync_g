import {
    IsOptional,
    IsArray,
    IsString,
    IsEnum,
    IsNumber,
    Min,
    Max,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  import { ExperienceLevel } from '../../common/enums/user-role.enum';
  
  export class ProfileFiltersDto {
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    skills?: string[];
  
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    industries?: string[];
  
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    interests?: string[];
  
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    targetIndustries?: string[];
  
    @IsOptional()
    @IsEnum(ExperienceLevel)
    experienceLevel?: ExperienceLevel;
  
    @IsOptional()
    @IsEnum(ExperienceLevel)
    currentLevel?: ExperienceLevel;
  
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(5)
    minRating?: number;
  
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    maxHourlyRate?: number;
  
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    languages?: string[];
  
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number;
  }