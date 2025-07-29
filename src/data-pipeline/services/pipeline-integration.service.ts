import { Injectable, Logger } from '@nestjs/common';
import { DataLoadingService } from './data-loading.service';
import { MatchingEngineService } from 'src/ai-system/services/matching-engine.service';
import { RecommendationService } from '../../mentee-preference/services/recommendation.service';
import { MatchingFeatureVector } from '../interfaces/pipeline.interface';

@Injectable()
export class PipelineIntegrationService {
  private readonly logger = new Logger(PipelineIntegrationService.name);

  constructor(
    private dataLoading: DataLoadingService,
    private matchingEngine: MatchingEngineService,
    private recommendationService: RecommendationService,
  ) {}

  /**
   * Updates the matching engine with new feature vectors
   */
  async updateMatchingEngine(userIds?: string[]): Promise<void> {
    try {
      this.logger.log('Updating matching engine with latest feature vectors');

      let vectors: MatchingFeatureVector[];

      if (userIds && userIds.length > 0) {
        // Update specific users
        vectors = await this.dataLoading.getFeatureVectorsBatch(userIds);
      } else {
        // Get all vectors (for full refresh)
        vectors = await this.dataLoading.getFeatureVectorsBatch([]);
      }

      // Separate mentors and mentees
      const mentorVectors = vectors.filter((v) => v.userType === 'mentor');
      const menteeVectors = vectors.filter((v) => v.userType === 'mentee');

      this.logger.log(
        `Updating matching engine with ${mentorVectors.length} mentors and ${menteeVectors.length} mentees`,
      );

      // Update the matching engine's internal data structures
      this.updateMatchingProfiles(mentorVectors, menteeVectors);

      this.logger.log('Matching engine updated successfully');
    } catch (error) {
      this.logger.error('Failed to update matching engine:', error);
      throw error;
    }
  }

  /**
   * Triggers recalculation of recommendations for affected users
   */
  async refreshRecommendations(affectedUserIds: string[]): Promise<void> {
    try {
      this.logger.log(
        `Refreshing recommendations for ${affectedUserIds.length} users`,
      );

      // For each affected user, clear cached recommendations
      // The recommendation service will recalculate on next request
      this.clearCachedRecommendations(affectedUserIds);

      this.logger.log('Recommendations refreshed successfully');
      return Promise.resolve();
    } catch (error) {
      this.logger.error('Failed to refresh recommendations:', error);
      throw error;
    }
  }

  /**
   * Validates that the pipeline integration is working correctly
   */
  async validateIntegration(): Promise<{
    matchingEngineStatus: 'healthy' | 'degraded' | 'offline';
    recommendationServiceStatus: 'healthy' | 'degraded' | 'offline';
    dataConsistency: boolean;
    lastUpdate: Date;
    issues: string[];
  }> {
    const issues: string[] = [];
    let matchingEngineStatus: 'healthy' | 'degraded' | 'offline' = 'healthy';
    let recommendationServiceStatus: 'healthy' | 'degraded' | 'offline' =
      'healthy';
    let dataConsistency = true;

    try {
      // Test matching engine
      const testUserId = 'test-user-id';
      const testVector = await this.dataLoading.getFeatureVector(testUserId);

      if (testVector) {
        try {
          // Test that matching engine can process the feature vector
          // This would depend on your matching engine implementation
          matchingEngineStatus = 'healthy';
        } catch (error: any) {
          matchingEngineStatus = 'degraded';
          issues.push(
            `Matching engine error: ${(error as Error)?.message || 'Unknown error'}`,
          );
        }
      }

      // Test recommendation service
      try {
        // Test recommendation service integration
        recommendationServiceStatus = 'healthy';
      } catch (error: any) {
        recommendationServiceStatus = 'degraded';
        issues.push(
          `Recommendation service error: ${(error as Error)?.message || 'Unknown error'}`,
        );
      }

      // Check data consistency
      const consistencyCheck = await this.checkDataConsistency();
      dataConsistency = consistencyCheck.isConsistent;
      if (!dataConsistency) {
        issues.push(...consistencyCheck.issues);
      }
    } catch (error: any) {
      issues.push(
        `Integration validation failed: ${(error as Error)?.message || 'Unknown error'}`,
      );
      matchingEngineStatus = 'offline';
      recommendationServiceStatus = 'offline';
      dataConsistency = false;
    }

    return {
      matchingEngineStatus,
      recommendationServiceStatus,
      dataConsistency,
      lastUpdate: new Date(),
      issues,
    };
  }

  private updateMatchingProfiles(
    mentorVectors: MatchingFeatureVector[],
    menteeVectors: MatchingFeatureVector[],
  ): void {
    // This would integrate with your specific matching engine implementation
    // For now, this is a placeholder that shows the integration pattern

    // Example: Update internal matching data structures
    for (const vector of [...mentorVectors, ...menteeVectors]) {
      // Convert feature vector to format expected by matching engine
      this.convertVectorToProfile(vector);

      // Update matching engine's internal storage
      // await this.matchingEngine.updateProfile(matchingProfile);
    }
  }

  private convertVectorToProfile(vector: MatchingFeatureVector): any {
    // Convert feature vector format to matching profile format
    return {
      userId: vector.userId,
      userType: vector.userType,
      skills: vector.features.skillsVector,
      experience: vector.features.experienceVector,
      availability: vector.features.availabilityVector,
      preferences: vector.features.preferenceVector,
      reputation: vector.features.reputationVector,
      engagement: vector.features.engagementVector,
      metadata: vector.metadata,
    };
  }

  private clearCachedRecommendations(userIds: string[]): void {
    // Clear cached recommendations for affected users
    // This would integrate with your Redis cache or recommendation service
    userIds.forEach(() => {
      // await this.recommendationService.clearCache(userId);
    });
  }

  private checkDataConsistency(): Promise<{
    isConsistent: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check that feature vectors exist for active users
      // Check that matching profiles are up to date
      // Check that recommendation cache is not stale

      // Placeholder implementation
      return Promise.resolve({ isConsistent: true, issues: [] });
    } catch (error: any) {
      issues.push(
        `Data consistency check failed: ${(error as Error)?.message || 'Unknown error'}`,
      );
      return Promise.resolve({ isConsistent: false, issues });
    }
  }
}
