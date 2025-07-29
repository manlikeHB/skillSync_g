import { IsString, IsEnum, IsObject, IsOptional, IsArray, IsNumber, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DataType } from '../enums/data-type.enum';

export class PrivacyMetadataDto {
  @IsString()
  anonymizationLevel: string;

  @IsNumber()
  dataRetentionDays: number;

  @IsBoolean()
  consentGiven: boolean;

  @IsOptional()
  @IsString()
  consentDate?: string;

  @IsArray()
  @IsString({ each: true })
  dataCategories: string[];
}

export class CreateDataCollectionDto {
  @IsString()
  userId: string;

  @IsEnum(DataType)
  dataType: DataType;

  @IsObject()
  rawData: Record<string, any>;

  @IsOptional()
  @ValidateNested()
  @Type(() => PrivacyMetadataDto)
  privacyMetadata?: PrivacyMetadataDto;
}

export class UpdateDataCollectionDto {
  @IsOptional()
  @IsObject()
  processedData?: Record<string, any>;

  @IsOptional()
  @IsObject()
  anonymizedData?: Record<string, any>;

  @IsOptional()
  @IsObject()
  validationResults?: Record<string, any>;

  @IsOptional()
  @ValidateNested()
  @Type(() => PrivacyMetadataDto)
  privacyMetadata?: PrivacyMetadataDto;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsObject()
  processingMetadata?: Record<string, any>;
}

export class DataCollectionQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(DataType)
  dataType?: DataType;

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