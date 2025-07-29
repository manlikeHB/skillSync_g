import { IsObject, IsOptional, IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class WorkflowConfigurationDto {
  @IsOptional()
  @IsObject()
  validation?: Record<string, any>;

  @IsOptional()
  @IsObject()
  preprocessing?: Record<string, any>;

  @IsOptional()
  @IsObject()
  anonymization?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  batchSize?: number;

  @IsOptional()
  @IsNumber()
  timeout?: number;

  @IsOptional()
  @IsNumber()
  retryAttempts?: number;

  @IsOptional()
  @IsString()
  algorithm?: string;

  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;
}

export class InputDataDto {
  @IsArray()
  @IsString({ each: true })
  dataCollectionIds: string[];

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @IsOptional()
  @IsObject()
  dateRange?: {
    start: string;
    end: string;
  };
}

export class CreateDataProcessingDto {
  @ValidateNested()
  @Type(() => WorkflowConfigurationDto)
  configuration: WorkflowConfigurationDto;

  @ValidateNested()
  @Type(() => InputDataDto)
  inputData: InputDataDto;
}

export class DataProcessingQueryDto {
  @IsOptional()
  @IsString()
  workflowType?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: string;
}