import { DataPreprocessingConfig } from './data-preprocessing-config.interface';
import { DataValidationRule } from './data-validation-rule.interface';
import { DataAnonymizationConfig } from './data-anonymization-config.interface';

export interface DataProcessingPipeline {
  id: string;
  name: string;
  description: string;
  steps: DataProcessingStep[];
  configuration: DataPreprocessingConfig;
  validationRules: DataValidationRule[];
  anonymizationConfig: DataAnonymizationConfig;
  status: 'active' | 'inactive' | 'draft';
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataProcessingStep {
  id: string;
  name: string;
  type: 'validation' | 'preprocessing' | 'anonymization' | 'transformation';
  order: number;
  configuration: Record<string, any>;
  dependencies: string[];
  timeout: number;
  retryAttempts: number;
}