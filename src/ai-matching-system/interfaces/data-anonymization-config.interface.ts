export interface DataAnonymizationConfig {
  anonymizationLevel?: string;
  kAnonymity?: number;
  lDiversity?: number;
  tCloseness?: number;
  generalization?: any;
  suppression?: any;
  microaggregation?: any;
  noiseAddition?: any;
  pseudonymization?: any;
  dataRetentionDays?: number;
  consentGiven?: boolean;
  dataCategories?: string[];
}