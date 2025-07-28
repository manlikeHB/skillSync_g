import { ApiProperty } from '@nestjs/swagger';
import { RecommendationExplanationDto } from './explanation.dto';

export class RecommendedUserDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User name' })
  name: string;

  @ApiProperty({ description: 'User title/position' })
  title: string;

  @ApiProperty({ description: 'User skills' })
  skills: string[];

  @ApiProperty({ description: 'User industry' })
  industry: string;

  @ApiProperty({ description: 'Experience level in years' })
  experienceYears: number;

  @ApiProperty({ description: 'User location' })
  location: string;
}

export class RecommendationResponseDto {
  @ApiProperty({ description: 'Recommended user details' })
  user: RecommendedUserDto;

  @ApiProperty({ description: 'Detailed explanation for this recommendation' })
  explanation: RecommendationExplanationDto;

  @ApiProperty({ description: 'Recommendation timestamp' })
  recommendedAt: Date;

  @ApiProperty({ description: 'Unique recommendation ID' })
  recommendationId: string;
}

export class RecommendationsListDto {
  @ApiProperty({ description: 'List of recommendations', type: [RecommendationResponseDto] })
  recommendations: RecommendationResponseDto[];

  @ApiProperty({ description: 'Total number of potential matches' })
  totalMatches: number;

  @ApiProperty({ description: 'Criteria used for matching' })
  searchCriteria: any;

  @ApiProperty({ description: 'Timestamp of recommendation generation' })
  generatedAt: Date;
}