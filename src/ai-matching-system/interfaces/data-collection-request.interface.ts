import { DataType } from '../enums/data-type.enum';

export interface DataCollectionRequest {
  userId: string;
  dataType: DataType;
  rawData: Record<string, any>;
  privacyMetadata?: {
    anonymizationLevel: string;
    dataRetentionDays: number;
    consentGiven: boolean;
    dataCategories: string[];
  };
}