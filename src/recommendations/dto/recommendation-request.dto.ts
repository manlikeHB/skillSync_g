import { IsOptional, IsString, IsArray, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecommendationRequestDto {
  @ApiProperty({ description: 'User ID requesting recommendations' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Type of recommendation', enum: ['mentor', 'mentee'] })
  @IsString()
  type: 'mentor' | 'mentee';

  @ApiProperty({ description: 'Skills to match', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiProperty({ description: 'Industry preferences', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industries?: string[];

  @ApiProperty({ description: 'Number of recommendations to return', default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number = 5;
}