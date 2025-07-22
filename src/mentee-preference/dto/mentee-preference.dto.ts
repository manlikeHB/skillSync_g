import { IsEnum, IsString, IsUUID, IsOptional, IsInt, Min, Max } from 'class-validator';
import { PreferenceType } from '../entities/mentee-preference.entity';

export class CreateMenteePreferenceDto {
  @IsUUID()
  preferredMentorId: string;

  @IsEnum(PreferenceType)
  @IsOptional()
  type?: PreferenceType = PreferenceType.PREFERRED;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  weight?: number = 1;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdateMenteePreferenceDto {
  @IsEnum(PreferenceType)
  @IsOptional()
  type?: PreferenceType;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  weight?: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class MenteePreferenceResponseDto {
  id: string;
  menteeId: string;
  preferredMentorId: string;
  type: PreferenceType;
  weight: number;
  reason?: string;
  preferredMentor: {
    id: string;
    firstName: string;
    lastName: string;
    skills: string[];
    bio?: string;
    profileImage?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}