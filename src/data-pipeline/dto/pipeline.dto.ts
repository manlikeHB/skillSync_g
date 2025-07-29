import {
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExecutePipelineDto {
  @ApiProperty({ description: 'Pipeline configuration ID' })
  @IsString()
  pipelineId: string;

  @ApiProperty({ description: 'Optional pipeline parameters', required: false })
  @IsOptional()
  parameters?: Record<string, any>;
}

export class FeatureVectorBatchDto {
  @ApiProperty({
    description: 'Array of user IDs to retrieve feature vectors for',
  })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}

export class PipelineConfigDto {
  @ApiProperty({ description: 'Pipeline ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Pipeline name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Pipeline description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Whether pipeline is enabled' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'Cron schedule expression', required: false })
  @IsOptional()
  @IsString()
  schedule?: string;
}

export class DataQualityReportDto {
  @ApiProperty({ description: 'Total number of feature vectors' })
  @IsNumber()
  totalVectors: number;

  @ApiProperty({ description: 'Number of high quality vectors' })
  @IsNumber()
  highQuality: number;

  @ApiProperty({ description: 'Number of medium quality vectors' })
  @IsNumber()
  mediumQuality: number;

  @ApiProperty({ description: 'Number of low quality vectors' })
  @IsNumber()
  lowQuality: number;

  @ApiProperty({ description: 'Average quality score' })
  @IsNumber()
  averageQuality: number;

  @ApiProperty({ description: 'List of quality issues found' })
  @IsArray()
  @IsString({ each: true })
  issues: string[];
}
