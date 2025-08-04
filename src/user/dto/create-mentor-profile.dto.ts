import {
    IsArray,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    IsBoolean,
    IsUrl,
    IsObject,
    ValidateNested,
    Min,
    Max,
    ArrayMinSize,
    ArrayMaxSize,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  import { ExperienceLevel, AvailabilityStatus } from '../../common/enums/user-role.enum';
  
  class AvailabilityDto {
    @IsArray()
    @IsString({ each: true })
    days: string[];
  
    @IsArray()
    @IsString({ each: true })
    timeSlots: string[];
  
    @IsString()
    timezone: string;
  }
  
  export class CreateMentorProfileDto {
    @IsArray()
    @IsString({ each: true })
    @ArrayMinSize(1)
    @ArrayMaxSize(20)
    skills: string[];
  
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(10)
    industries: string[];
  
    @IsEnum(ExperienceLevel)
    experienceLevel: ExperienceLevel;
  
    @IsNumber()
    @Min(0)
    @Max(50)
    yearsOfExperience: number;
  
    @IsOptional()
    @IsString()
    currentPosition?: string;
  
    @IsOptional()
    @IsString()
    company?: string;
  
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(10)
    mentorshipAreas: string[];
  
    @IsNumber()
    @Min(1)
    @Max(20)
    maxMentees: number;
  
    @IsEnum(AvailabilityStatus)
    availabilityStatus: AvailabilityStatus;
  
    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => AvailabilityDto)
    availability?: AvailabilityDto;
  
    @IsOptional()
    @IsNumber()
    @Min(0)
    hourlyRate?: number;
  
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(10)
    languages: string[];
  
    @IsOptional()
    @IsUrl()
    linkedinUrl?: string;
  
    @IsOptional()
    @IsUrl()
    githubUrl?: string;
  
    @IsOptional()
    @IsUrl()
    personalWebsite?: string;
  }