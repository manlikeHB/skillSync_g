import { IsEnum, IsInt, IsString, IsOptional, IsArray, IsBoolean, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { FeedbackType } from '../../entities/feedback.entity';

class SpecificFeedbackDto {
  @IsOptional()
  @IsBoolean()
  skillsMatched?: boolean;

  @IsOptional()
  @IsBoolean()
  communicationEffective?: boolean;

  @IsOptional()
  @IsBoolean()
  goalsAligned?: boolean;

  @IsOptional()
  @IsBoolean()
  timeCommitmentMet?: boolean;

  @IsOptional()
  @IsBoolean()
  wouldRecommend?: boolean;
}

export class CreateFeedbackDto {
  @IsString()
  matchId: string;

  @IsEnum(FeedbackType)
  type: FeedbackType;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SpecificFeedbackDto)
  specificFeedback?: SpecificFeedbackDto;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
