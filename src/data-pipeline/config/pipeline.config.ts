export const PIPELINE_CONFIG = {
  // Data extraction configuration
  extraction: {
    batchSize: 1000,
    maxConcurrentQueries: 5,
    timeoutMs: 30000,
    retryAttempts: 3,
  },

  // Data transformation configuration
  transformation: {
    skillsVectorDimension: 100,
    experienceVectorDimension: 5,
    availabilityVectorDimension: 3,
    preferenceVectorDimension: 3,
    reputationVectorDimension: 3,
    engagementVectorDimension: 2,
    qualityThresholds: {
      minimum: 30,
      good: 60,
      excellent: 80,
    },
  },

  // Data loading configuration
  loading: {
    batchSize: 1000,
    maxRetries: 3,
    retryDelayMs: 5000,
    cacheExpirationHours: 6,
  },

  // Monitoring configuration
  monitoring: {
    healthCheckIntervalMinutes: 5,
    metricsRetentionDays: 30,
    alertThresholds: {
      maxFailureRatePercent: 10,
      maxExecutionTimeMinutes: 30,
      maxDataAgeHours: 24,
      minQualityScore: 60,
    },
  },

  // Pipeline schedules
  schedules: {
    incrementalPipeline: '0 * * * *', // Every hour
    fullPipeline: '0 2 * * *', // Daily at 2 AM
    healthCheck: '*/5 * * * *', // Every 5 minutes
    cleanup: '0 3 * * 0', // Weekly at 3 AM on Sunday
  },
};
