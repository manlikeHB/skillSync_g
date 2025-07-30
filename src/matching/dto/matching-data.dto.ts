import { 
  IsString, 
  IsEmail, 
  IsEnum, 
  IsNumber, 
  IsArray, 
  IsOptional, 
  IsBoolean, 
  IsDateString,
  Min, 
  Max, 
  ArrayMinSize, 
  ArrayMaxSize,
  ValidateNested,
  IsObject,
  IsUUID
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  UserRole,
  SkillCategory,
  ProficiencyLevel,
  ExperienceLevel,
  GoalCategory,
  Priority,
  Timeline,
  DayOfWeek,
  MentoringApproach,
  CommunicationStyle,
  FeedbackStyle,
  InteractionFrequency,
  CommunicationType,
  MeetingFormat,
  Gender,
  EducationLevel,
  LocationPreference,
  PricingModel
} from '../interfaces/matching-data.interface';

// Base User Profile DTOs
export class BaseUserProfileDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Full name', minLength: 2, maxLength: 50 })
  @IsString()
  @Min(2)
  @Max(50)
  name: string;

  @ApiProperty({ description: 'User role', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ description: 'Personal bio', maxLength: 500 })
  @IsString()
  @Max(500)
  bio: string;

  @ApiProperty({ description: 'Account creation date' })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @IsDateString()
  updatedAt: Date;

  @ApiProperty({ description: 'Account active status' })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: 'Reputation score', minimum: 0, maximum: 5 })
  @IsNumber()
  @Min(0)
  @Max(5)
  reputationScore: number;
}

// Skills DTOs
export class SkillDto {
  @ApiProperty({ description: 'Skill name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Skill category', enum: SkillCategory })
  @IsEnum(SkillCategory)
  category: SkillCategory;

  @ApiProperty({ description: 'Proficiency level', enum: ProficiencyLevel })
  @IsEnum(ProficiencyLevel)
  proficiencyLevel: ProficiencyLevel;

  @ApiProperty({ description: 'Years of experience', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;

  @ApiProperty({ description: 'Related certifications', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiProperty({ description: 'Portfolio projects', required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectDto)
  projects?: ProjectDto[];
}

export class ProjectDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Project name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Project description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Technologies used' })
  @IsArray()
  @IsString({ each: true })
  technologies: string[];

  @ApiProperty({ description: 'Project URL', required: false })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({ description: 'Completion date', required: false })
  @IsOptional()
  @IsDateString()
  completedAt?: Date;
}

export class CertificationDto {
  @ApiProperty({ description: 'Certification ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Certification name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Issuing organization' })
  @IsString()
  issuer: string;

  @ApiProperty({ description: 'Issue date' })
  @IsDateString()
  issueDate: Date;

  @ApiProperty({ description: 'Expiry date', required: false })
  @IsOptional()
  @IsDateString()
  expiryDate?: Date;

  @ApiProperty({ description: 'Credential ID', required: false })
  @IsOptional()
  @IsString()
  credentialId?: string;
}

// Learning Goals DTOs
export class LearningGoalDto {
  @ApiProperty({ description: 'Goal ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Goal title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Goal description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Goal category', enum: GoalCategory })
  @IsEnum(GoalCategory)
  category: GoalCategory;

  @ApiProperty({ description: 'Priority level', enum: Priority })
  @IsEnum(Priority)
  priority: Priority;

  @ApiProperty({ description: 'Timeline', enum: Timeline })
  @IsEnum(Timeline)
  timeline: Timeline;

  @ApiProperty({ description: 'Success metrics' })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  successMetrics: string[];

  @ApiProperty({ description: 'Active status' })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: 'Creation date' })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({ description: 'Target completion date', required: false })
  @IsOptional()
  @IsDateString()
  targetCompletionDate?: Date;
}

// Availability DTOs
export class TimeSlotDto {
  @ApiProperty({ description: 'Start time (HH:MM)' })
  @IsString()
  startTime: string;

  @ApiProperty({ description: 'End time (HH:MM)' })
  @IsString()
  endTime: string;

  @ApiProperty({ description: 'Availability status' })
  @IsBoolean()
  isAvailable: boolean;
}

export class WeeklyAvailabilityDto {
  @ApiProperty({ description: 'Day of week', enum: DayOfWeek })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({ description: 'Time slots' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  timeSlots: TimeSlotDto[];
}

export class AvailabilityScheduleDto {
  @ApiProperty({ description: 'Timezone (IANA format)' })
  @IsString()
  timezone: string;

  @ApiProperty({ description: 'Weekly availability' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyAvailabilityDto)
  weeklyAvailability: WeeklyAvailabilityDto[];

  @ApiProperty({ description: 'Preferred meeting duration (minutes)' })
  @IsNumber()
  @Min(15)
  @Max(180)
  preferredMeetingDuration: number;

  @ApiProperty({ description: 'Maximum meetings per week' })
  @IsNumber()
  @Min(1)
  @Max(10)
  maxMeetingsPerWeek: number;

  @ApiProperty({ description: 'Blackout dates' })
  @IsArray()
  @IsDateString({}, { each: true })
  blackoutDates: Date[];
}

// Mentoring Style DTOs
export class MentoringStyleDto {
  @ApiProperty({ description: 'Mentoring approach', enum: MentoringApproach })
  @IsEnum(MentoringApproach)
  approach: MentoringApproach;

  @ApiProperty({ description: 'Communication style', enum: CommunicationStyle })
  @IsEnum(CommunicationStyle)
  communicationStyle: CommunicationStyle;

  @ApiProperty({ description: 'Feedback style', enum: FeedbackStyle })
  @IsEnum(FeedbackStyle)
  feedbackStyle: FeedbackStyle;

  @ApiProperty({ description: 'Interaction frequency', enum: InteractionFrequency })
  @IsEnum(InteractionFrequency)
  preferredInteractionFrequency: InteractionFrequency;
}

export class CommunicationPreferenceDto {
  @ApiProperty({ description: 'Communication type', enum: CommunicationType })
  @IsEnum(CommunicationType)
  type: CommunicationType;

  @ApiProperty({ description: 'Interaction frequency', enum: InteractionFrequency })
  @IsEnum(InteractionFrequency)
  frequency: InteractionFrequency;

  @ApiProperty({ description: 'Preferred time' })
  @IsString()
  preferredTime: string;
}

// Demographic DTOs
export class LocationDto {
  @ApiProperty({ description: 'Country' })
  @IsString()
  country: string;

  @ApiProperty({ description: 'State/province', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ description: 'City', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ description: 'Timezone' })
  @IsString()
  timezone: string;

  @ApiProperty({ description: 'Coordinates', required: false })
  @IsOptional()
  @IsObject()
  coordinates?: { lat: number; lng: number };
}

export class DemographicInfoDto {
  @ApiProperty({ description: 'Age', required: false })
  @IsOptional()
  @IsNumber()
  @Min(13)
  @Max(120)
  age?: number;

  @ApiProperty({ description: 'Gender', enum: Gender, required: false })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({ description: 'Ethnic background', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ethnicity?: string[];

  @ApiProperty({ description: 'Location information' })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({ description: 'Education level', enum: EducationLevel })
  @IsEnum(EducationLevel)
  educationLevel: EducationLevel;

  @ApiProperty({ description: 'Languages spoken' })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  languages: string[];

  @ApiProperty({ description: 'Accessibility needs', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disabilities?: string[];
}

// Mentor Profile DTO
export class MentorProfileDto extends BaseUserProfileDto {
  @ApiProperty({ description: 'Skills with proficiency levels' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  skills: SkillDto[];

  @ApiProperty({ description: 'Areas of expertise' })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  expertiseAreas: string[];

  @ApiProperty({ description: 'Years of professional experience' })
  @IsNumber()
  @Min(0)
  @Max(50)
  experienceYears: number;

  @ApiProperty({ description: 'Primary industry' })
  @IsString()
  industry: string;

  @ApiProperty({ description: 'Current company', required: false })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty({ description: 'Professional title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Credential file path' })
  @IsString()
  credentialFile: string;

  @ApiProperty({ description: 'Verification status' })
  @IsBoolean()
  isVerified: boolean;

  @ApiProperty({ description: 'Professional certifications' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  certifications: CertificationDto[];

  @ApiProperty({ description: 'Availability schedule' })
  @ValidateNested()
  @Type(() => AvailabilityScheduleDto)
  availability: AvailabilityScheduleDto;

  @ApiProperty({ description: 'Maximum mentees' })
  @IsNumber()
  @Min(1)
  @Max(10)
  maxMentees: number;

  @ApiProperty({ description: 'Preferred meeting formats' })
  @IsArray()
  @IsEnum(MeetingFormat, { each: true })
  preferredMeetingFormat: MeetingFormat[];

  @ApiProperty({ description: 'Hourly rate', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiProperty({ description: 'Mentoring style' })
  @ValidateNested()
  @Type(() => MentoringStyleDto)
  mentoringStyle: MentoringStyleDto;

  @ApiProperty({ description: 'Communication preferences' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommunicationPreferenceDto)
  communicationPreferences: CommunicationPreferenceDto[];
}

// Mentee Profile DTO
export class MenteeProfileDto extends BaseUserProfileDto {
  @ApiProperty({ description: 'Learning goals' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LearningGoalDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  learningGoals: LearningGoalDto[];

  @ApiProperty({ description: 'Target skills to develop' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  targetSkills: SkillDto[];

  @ApiProperty({ description: 'Experience level', enum: ExperienceLevel })
  @IsEnum(ExperienceLevel)
  experienceLevel: ExperienceLevel;

  @ApiProperty({ description: 'Current role', required: false })
  @IsOptional()
  @IsString()
  currentRole?: string;

  @ApiProperty({ description: 'Target industry', required: false })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({ description: 'Education level', enum: EducationLevel })
  @IsEnum(EducationLevel)
  educationLevel: EducationLevel;

  @ApiProperty({ description: 'Preferred mentor characteristics' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MentorCharacteristicDto)
  preferredMentorCharacteristics: MentorCharacteristicDto[];

  @ApiProperty({ description: 'Availability schedule' })
  @ValidateNested()
  @Type(() => AvailabilityScheduleDto)
  availability: AvailabilityScheduleDto;

  @ApiProperty({ description: 'Monthly budget', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiProperty({ description: 'Preferred meeting formats' })
  @IsArray()
  @IsEnum(MeetingFormat, { each: true })
  preferredMeetingFormat: MeetingFormat[];
}

export class MentorCharacteristicDto {
  @ApiProperty({ description: 'Characteristic trait' })
  @IsString()
  trait: string;

  @ApiProperty({ description: 'Importance level (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  importance: number;

  @ApiProperty({ description: 'Description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

// Matching Preferences DTOs
export class AvailabilityRequirementDto {
  @ApiProperty({ description: 'Minimum hours per week' })
  @IsNumber()
  @Min(1)
  @Max(40)
  minHoursPerWeek: number;

  @ApiProperty({ description: 'Preferred days' })
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  preferredDays: DayOfWeek[];

  @ApiProperty({ description: 'Preferred time slots' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  preferredTimeSlots: TimeSlotDto[];

  @ApiProperty({ description: 'Timezone' })
  @IsString()
  timezone: string;
}

export class MatchingPreferencesDto {
  @ApiProperty({ description: 'Required skills' })
  @IsArray()
  @IsString({ each: true })
  requiredSkills: string[];

  @ApiProperty({ description: 'Preferred skills' })
  @IsArray()
  @IsString({ each: true })
  preferredSkills: string[];

  @ApiProperty({ description: 'Minimum skill proficiency level', enum: ProficiencyLevel })
  @IsEnum(ProficiencyLevel)
  skillProficiencyLevel: ProficiencyLevel;

  @ApiProperty({ description: 'Minimum experience years', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minExperienceYears?: number;

  @ApiProperty({ description: 'Maximum experience years', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxExperienceYears?: number;

  @ApiProperty({ description: 'Preferred industries', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industryPreference?: string[];

  @ApiProperty({ description: 'Gender preferences', required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(Gender, { each: true })
  genderPreference?: Gender[];

  @ApiProperty({ description: 'Age range preferences', required: false })
  @IsOptional()
  @IsObject()
  ageRange?: { min: number; max: number };

  @ApiProperty({ description: 'Location preference', enum: LocationPreference, required: false })
  @IsOptional()
  @IsEnum(LocationPreference)
  locationPreference?: LocationPreference;

  @ApiProperty({ description: 'Communication style preferences', required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(CommunicationStyle, { each: true })
  communicationStylePreference?: CommunicationStyle[];

  @ApiProperty({ description: 'Meeting format preferences' })
  @IsArray()
  @IsEnum(MeetingFormat, { each: true })
  meetingFormatPreference: MeetingFormat[];

  @ApiProperty({ description: 'Availability requirements' })
  @ValidateNested()
  @Type(() => AvailabilityRequirementDto)
  requiredAvailability: AvailabilityRequirementDto;

  @ApiProperty({ description: 'Maximum budget', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxBudget?: number;

  @ApiProperty({ description: 'Pricing preference', enum: PricingModel, required: false })
  @IsOptional()
  @IsEnum(PricingModel)
  pricingPreference?: PricingModel;
}

// Matching Request/Response DTOs
export class MatchingFiltersDto {
  @ApiProperty({ description: 'Minimum compatibility score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  minScore: number;

  @ApiProperty({ description: 'Maximum geographic distance (km)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDistance?: number;

  @ApiProperty({ description: 'Minimum availability overlap (hours)', minimum: 0 })
  @IsNumber()
  @Min(0)
  availabilityOverlap: number;

  @ApiProperty({ description: 'Minimum skill match percentage', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  skillMatchThreshold: number;
}

export class MatchingRequestDto {
  @ApiProperty({ description: 'User ID requesting matches' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'User type', enum: ['mentor', 'mentee'] })
  @IsString()
  userType: 'mentor' | 'mentee';

  @ApiProperty({ description: 'Matching preferences' })
  @ValidateNested()
  @Type(() => MatchingPreferencesDto)
  preferences: MatchingPreferencesDto;

  @ApiProperty({ description: 'Matching filters' })
  @ValidateNested()
  @Type(() => MatchingFiltersDto)
  filters: MatchingFiltersDto;

  @ApiProperty({ description: 'Number of matches to return', minimum: 1, maximum: 50 })
  @IsNumber()
  @Min(1)
  @Max(50)
  limit: number;

  @ApiProperty({ description: 'Algorithm to use' })
  @IsString()
  algorithm: string;
}

export class ScoreBreakdownDto {
  @ApiProperty({ description: 'Skills compatibility score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  skillMatch: number;

  @ApiProperty({ description: 'Experience compatibility score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  experienceMatch: number;

  @ApiProperty({ description: 'Availability compatibility score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  availabilityMatch: number;

  @ApiProperty({ description: 'Preference alignment score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  preferenceMatch: number;

  @ApiProperty({ description: 'Demographic compatibility score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  demographicMatch: number;

  @ApiProperty({ description: 'Reputation score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  reputationScore: number;
}

export class MatchResultDto {
  @ApiProperty({ description: 'Target user ID' })
  @IsUUID()
  targetUserId: string;

  @ApiProperty({ description: 'Overall compatibility score', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  score: number;

  @ApiProperty({ description: 'Confidence in the match', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({ description: 'Detailed scoring breakdown' })
  @ValidateNested()
  @Type(() => ScoreBreakdownDto)
  breakdown: ScoreBreakdownDto;

  @ApiProperty({ description: 'Human-readable match reasons' })
  @IsArray()
  @IsString({ each: true })
  reasons: string[];

  @ApiProperty({ description: 'Match metadata' })
  @IsObject()
  metadata: Record<string, any>;
}

export class MatchingResponseDto {
  @ApiProperty({ description: 'Matching results' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatchResultDto)
  matches: MatchResultDto[];

  @ApiProperty({ description: 'Total profiles processed' })
  @IsNumber()
  totalProcessed: number;

  @ApiProperty({ description: 'Execution time in milliseconds' })
  @IsNumber()
  executionTime: number;

  @ApiProperty({ description: 'Algorithm used' })
  @IsString()
  algorithm: string;
} 