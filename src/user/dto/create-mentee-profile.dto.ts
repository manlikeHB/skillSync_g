import {
    IsArray,
    IsEnum,
    IsOptional,
    IsString,
    IsBoolean,
    IsUrl,
    IsObject,
    ValidateNested,
    IsNumber,
    Min,
    ArrayMaxSize,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  import { ExperienceLevel } from '../../common/enums/user-role.enum';
  
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
  
  export class CreateMenteeProfileDto {
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(20)
    interests: string[];
  
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(10)
    targetIndustries: string[];
  
    @IsEnum(ExperienceLevel)
    currentLevel: ExperienceLevel;
  
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(20)
    skillsToLearn: string[];
  
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(10)
    careerGoals: string[];
  
    @IsOptional()
    @IsString()
    currentRole?: string;
  
    @IsOptional()
    @IsString()
    currentCompany?: string;
  
    @IsOptional()
    @IsString()
    education?: string;
  
    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => AvailabilityDto)
    availability?: AvailabilityDto;
  
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(5)
    preferredMentorshipStyle: string[];
  
    @IsOptional()
    @IsNumber()
    @Min(0)
    budget?: number;
  
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
    portfolioUrl?: string;
  
    @IsBoolean()
    isLookingForMentor: boolean;
  }