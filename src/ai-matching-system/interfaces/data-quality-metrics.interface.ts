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
  kAnonymityLevel: number;
  lDiversityLevel: number;
  tClosenessLevel: number;
  informationLoss: number;
  privacyGain: number;
  anonymizationRatio: number;
  dataRetentionCompliance: boolean;
  consentCompliance: boolean;
}