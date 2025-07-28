import { ApiProperty } from '@nestjs/swagger';

export class ExplanationFactorDto {
  @ApiProperty({ description: 'Factor name' })
  factor: string;

  @ApiProperty({ description: 'Weight of this factor in the recommendation' })
  weight: number;

  @ApiProperty({ description: 'Human-readable explanation' })
  explanation: string;

  @ApiProperty({ description: 'Specific matching details' })
  details: string;
}

export class RecommendationExplanationDto {
  @ApiProperty({ description: 'Overall match score (0-100)' })
  matchScore: number;

  @ApiProperty({ description: 'Primary reason for recommendation' })
  primaryReason: string;

  @ApiProperty({ description: 'Detailed explanation factors', type: [ExplanationFactorDto] })
  factors: ExplanationFactorDto[];

  @ApiProperty({ description: 'Potential concerns or limitations' })
  concerns: string[];

  @ApiProperty({ description: 'Why this match is better than alternatives' })
  advantages: string[];
}