export interface DataSource {
  id: string;
  name: string;
  type: 'database' | 'api' | 'file' | 'stream';
  config: Record<string, any>;
  enabled: boolean;
  lastSync?: Date;
}

export interface DataTransformationRule {
  id: string;
  field: string;
  operation: 'normalize' | 'validate' | 'enrich' | 'clean' | 'aggregate';
  parameters: Record<string, any>;
  priority: number;
}

export interface PipelineStage {
  id: string;
  name: string;
  type: 'extract' | 'transform' | 'load' | 'validate';
  enabled: boolean;
  config: Record<string, any>;
  dependencies?: string[];
}

export interface PipelineConfig {
  id: string;
  name: string;
  description: string;
  stages: PipelineStage[];
  schedule?: string; // Cron expression
  retryPolicy: {
    maxRetries: number;
    backoffStrategy: 'linear' | 'exponential';
    initialDelay: number;
  };
  alerting: {
    enabled: boolean;
    channels: string[];
    thresholds: {
      errorRate: number;
      executionTime: number;
    };
  };
}

export interface PipelineMetrics {
  pipelineId: string;
  executionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  recordsProcessed: number;
  recordsSuccessful: number;
  recordsFailed: number;
  errorMessages: string[];
  performance: {
    extractTime: number;
    transformTime: number;
    loadTime: number;
    totalTime: number;
  };
}

export interface CleanedMentorData {
  userId: string;
  profile: {
    name: string;
    email: string;
    bio?: string;
    verified: boolean;
  };
  expertise: {
    skills: string[];
    domains: string[];
    experienceLevel: 'junior' | 'mid' | 'senior' | 'expert';
    yearsOfExperience: number;
  };
  availability: {
    timezone: string;
    preferredTimes: string[];
    maxMentees: number;
    currentLoad: number;
  };
  preferences: {
    menteeLevel: string[];
    communicationStyle: string[];
    sessionTypes: string[];
  };
  reputation: {
    score: number;
    totalSessions: number;
    averageRating: number;
    feedbackCount: number;
  };
  metadata: {
    lastActive: Date;
    profileCompleteness: number;
    verificationStatus: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface CleanedMenteeData {
  userId: string;
  profile: {
    name: string;
    email: string;
    bio?: string;
  };
  goals: {
    learningObjectives: string[];
    skillsToLearn: string[];
    careerGoals: string[];
    timeframe: string;
  };
  currentLevel: {
    skills: Record<string, number>; // skill -> proficiency level (1-10)
    experience: string;
    background: string[];
  };
  preferences: {
    mentorExperience: string[];
    communicationStyle: string[];
    sessionFrequency: string;
    availability: string[];
  };
  engagement: {
    sessionsCompleted: number;
    averageRating: number;
    lastSessionDate?: Date;
    responsiveness: number;
  };
  metadata: {
    joinDate: Date;
    profileCompleteness: number;
    lastActive: Date;
    preferences: Record<string, any>;
  };
}

export interface MatchingFeatureVector {
  userId: string;
  userType: 'mentor' | 'mentee';
  features: {
    skillsVector: number[];
    experienceVector: number[];
    availabilityVector: number[];
    preferenceVector: number[];
    reputationVector: number[];
    engagementVector: number[];
  };
  metadata: {
    lastUpdated: Date;
    version: string;
    qualityScore: number;
  };
}
