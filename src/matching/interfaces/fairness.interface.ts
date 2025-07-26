export interface DemographicInfo {
    gender?: string;
    ethnicity?: string;
    age?: number;
    location?: string;
    educationLevel?: string;
    experienceLevel?: string;
  }
  
  export interface FairnessMetrics {
    demographicParity: number;
    equalOpportunity: number;
    equalizingOdds: number;
    calibration: number;
  }
  
  export interface MatchingConstraints {
    maxDemographicImbalance: number;
    minEqualOpportunity: number;
    diversityWeight: number;
    skillWeight: number;
    preferenceWeight: number;
  }
  