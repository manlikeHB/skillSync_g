export interface DataValidationRule {
  field: string;
  type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
  severity: 'error' | 'warning';
}

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  dataQuality: number;
  validationTime: number;
  rulesApplied: DataValidationRule[];
}

export interface DataPreprocessingConfig {
  normalization: {
    enabled: boolean;
    method: 'minmax' | 'zscore' | 'robust';
    fields: string[];
  };
  encoding: {
    enabled: boolean;
    method: 'onehot' | 'label' | 'target';
    categoricalFields: string[];
  };
  featureEngineering: {
    enabled: boolean;
    features: string[];
    transformations: Record<string, string>;
  };
  outlierDetection: {
    enabled: boolean;
    method: 'iqr' | 'zscore' | 'isolation_forest';
    threshold: number;
  };
}

export interface DataAnonymizationConfig {
  anonymizationLevel: 'low' | 'medium' | 'high';
  techniques: {
    generalization: {
      enabled: boolean;
      fields: string[];
      levels: Record<string, number>;
    };
    suppression: {
      enabled: boolean;
      fields: string[];
      threshold: number;
    };
    perturbation: {
      enabled: boolean;
      fields: string[];
      noiseLevel: number;
    };
    pseudonymization: {
      enabled: boolean;
      fields: string[];
      salt: string;
    };
  };
  privacyMetrics: {
    kAnonymity: number;
    lDiversity: number;
    tCloseness: number;
  };
}

export interface DataCollectionRequest {
  userId: string;
  dataType: 'string' | 'number' | 'boolean' | 'object' | 'array';
  rawData: Record<string, any>;
  privacyMetadata?: {
    anonymizationLevel: string;
    dataRetentionDays: number;
    consentGiven: boolean;
    dataCategories: string[];
  };
}

export interface DataProcessingRequest {
  configuration: any;
  inputData: any;
}

export interface DataProcessingResponse {
  success: boolean;
  data: any;
  metadata: any;
}

export interface DataQualityMetrics {
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  validity: number;
  uniqueness: number;
  overallScore: number;
}

export interface PrivacyMetrics {
  kAnonymity: number;
  lDiversity: number;
  tCloseness: number;
  differentialPrivacy: number;
  reidentificationRisk: number;
}

export interface DataProcessingPipeline {
  steps: DataProcessingStep[];
  status: string;
}

export interface DataProcessingStep {
  name: string;
  status: string;
  result: any;
} 