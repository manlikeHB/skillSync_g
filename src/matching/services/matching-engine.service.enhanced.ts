import { Injectable, Logger } from '@nestjs/common';
import { DataLoadingService } from '../../data-pipeline/services/data-loading.service';
import { MatchingFeatureVector } from '../../data-pipeline/interfaces/pipeline.interface';
import {
  MatchingResult,
  MatchingCriteria,
} from '../../ai-system/interfaces/matching.interface';

@Injectable()
export class EnhancedMatchingEngineService {
  private readonly logger = new Logger(EnhancedMatchingEngineService.name);
  private featureVectorCache = new Map<string, MatchingFeatureVector>();
  private lastCacheUpdate = new Date(0);

  constructor(private dataLoadingService: DataLoadingService) {}

  async findMatches(
    request: { criteria: MatchingCriteria; limit?: number; threshold?: number },
    algorithm: string = 'cosine-similarity',
  ): Promise<{
    matches: MatchingResult[];
    totalProcessed: number;
    executionTime: number;
    algorithm: string;
  }> {
    const startTime = Date.now();

    try {
      // Ensure we have fresh feature vectors
      await this.refreshFeatureVectors();

      // Get user's feature vector
      const userVector = await this.dataLoadingService.getFeatureVector(
        request.criteria.userId,
      );
      if (!userVector) {
        throw new Error(
          `Feature vector not found for user ${request.criteria.userId}`,
        );
      }

      // Get candidate vectors based on user type
      const candidateType =
        userVector.userType === 'mentor' ? 'mentee' : 'mentor';
      const candidateVectors = Array.from(
        this.featureVectorCache.values(),
      ).filter((v) => v.userType === candidateType);

      // Calculate similarity scores
      const matches: MatchingResult[] = [];
      const threshold = request.threshold || 0.5;

      for (const candidate of candidateVectors) {
        const similarity = this.calculateSimilarity(
          userVector,
          candidate,
          algorithm,
        );

        if (similarity >= threshold) {
          matches.push({
            targetId: candidate.userId,
            score: similarity,
            confidence: this.calculateConfidence(
              similarity,
              candidate.metadata.qualityScore,
            ),
            reasons: this.generateMatchReasons(userVector, candidate),
            metadata: {
              algorithm,
              dataQuality: candidate.metadata.qualityScore,
              lastUpdated: candidate.metadata.lastUpdated,
            },
          });
        }
      }

      // Sort by score and limit results
      matches.sort((a: MatchingResult, b: MatchingResult) => b.score - a.score);
      const limitedMatches = matches.slice(0, request.limit || 10);

      const executionTime = Date.now() - startTime;

      this.logger.log(
        `Found ${limitedMatches.length} matches for user ${request.criteria.userId} in ${executionTime}ms`,
      );

      return {
        matches: limitedMatches,
        totalProcessed: candidateVectors.length,
        executionTime,
        algorithm,
      };
    } catch (error) {
      this.logger.error('Error finding matches:', error);
      throw error;
    }
  }

  private async refreshFeatureVectors(): Promise<void> {
    const cacheAge = Date.now() - this.lastCacheUpdate.getTime();
    const maxCacheAge = 5 * 60 * 1000; // 5 minutes

    if (cacheAge > maxCacheAge || this.featureVectorCache.size === 0) {
      this.logger.log('Refreshing feature vector cache');

      try {
        // Get all feature vectors
        const vectors = await this.dataLoadingService.getFeatureVectorsBatch(
          [],
        );

        // Update cache
        this.featureVectorCache.clear();
        vectors.forEach((vector) => {
          this.featureVectorCache.set(vector.userId, vector);
        });

        this.lastCacheUpdate = new Date();
        this.logger.log(`Cached ${vectors.length} feature vectors`);
      } catch (error) {
        this.logger.error('Failed to refresh feature vector cache:', error);
        throw error;
      }
    }
  }

  private calculateSimilarity(
    userVector: MatchingFeatureVector,
    candidateVector: MatchingFeatureVector,
    algorithm: string,
  ): number {
    switch (algorithm) {
      case 'cosine-similarity':
        return this.cosineSimilarity(userVector, candidateVector);
      case 'euclidean-distance':
        return this.euclideanSimilarity(userVector, candidateVector);
      case 'weighted-hybrid':
        return this.weightedHybridSimilarity(userVector, candidateVector);
      default:
        return this.cosineSimilarity(userVector, candidateVector);
    }
  }

  private cosineSimilarity(
    vector1: MatchingFeatureVector,
    vector2: MatchingFeatureVector,
  ): number {
    // Combine all feature vectors into single vectors
    const v1 = this.combineFeatures(vector1.features);
    const v2 = this.combineFeatures(vector2.features);

    const dotProduct = v1.reduce((sum, val, i) => sum + val * v2[i], 0);
    const magnitude1 = Math.sqrt(v1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(v2.reduce((sum, val) => sum + val * val, 0));

    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
  }

  private euclideanSimilarity(
    vector1: MatchingFeatureVector,
    vector2: MatchingFeatureVector,
  ): number {
    const v1 = this.combineFeatures(vector1.features);
    const v2 = this.combineFeatures(vector2.features);

    const squaredDiffs = v1.reduce(
      (sum, val, i) => sum + Math.pow(val - v2[i], 2),
      0,
    );
    const distance = Math.sqrt(squaredDiffs);

    // Convert distance to similarity (0-1 range)
    return 1 / (1 + distance);
  }

  private weightedHybridSimilarity(
    vector1: MatchingFeatureVector,
    vector2: MatchingFeatureVector,
  ): number {
    const weights = {
      skills: 0.4,
      experience: 0.2,
      availability: 0.15,
      preferences: 0.15,
      reputation: 0.05,
      engagement: 0.05,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    // Calculate similarity for each feature type separately
    const featureTypes = Object.keys(weights) as (keyof typeof weights)[];

    for (const featureType of featureTypes) {
      const feature1 =
        vector1.features[
          `${featureType}Vector` as keyof typeof vector1.features
        ];
      const feature2 =
        vector2.features[
          `${featureType}Vector` as keyof typeof vector2.features
        ];

      if (feature1 && feature2) {
        const similarity = this.vectorSimilarity(feature1, feature2);
        weightedSum += similarity * weights[featureType];
        totalWeight += weights[featureType];
      }
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private vectorSimilarity(v1: number[], v2: number[]): number {
    if (v1.length !== v2.length) return 0;

    const dotProduct = v1.reduce((sum, val, i) => sum + val * v2[i], 0);
    const magnitude1 = Math.sqrt(v1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(v2.reduce((sum, val) => sum + val * val, 0));

    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
  }

  private combineFeatures(
    features: MatchingFeatureVector['features'],
  ): number[] {
    return [
      ...features.skillsVector,
      ...features.experienceVector,
      ...features.availabilityVector,
      ...features.preferenceVector,
      ...features.reputationVector,
      ...features.engagementVector,
    ];
  }

  private calculateConfidence(
    similarity: number,
    qualityScore: number,
  ): number {
    // Confidence based on both similarity score and data quality
    const qualityWeight = qualityScore / 100;
    return similarity * qualityWeight;
  }

  private generateMatchReasons(
    userVector: MatchingFeatureVector,
    candidateVector: MatchingFeatureVector,
  ): string[] {
    const reasons: string[] = [];

    // Skills compatibility
    const skillsSimilarity = this.vectorSimilarity(
      userVector.features.skillsVector,
      candidateVector.features.skillsVector,
    );
    if (skillsSimilarity > 0.7) {
      reasons.push(
        `Strong skills alignment (${(skillsSimilarity * 100).toFixed(0)}% match)`,
      );
    }

    // Experience compatibility
    const experienceSimilarity = this.vectorSimilarity(
      userVector.features.experienceVector,
      candidateVector.features.experienceVector,
    );
    if (experienceSimilarity > 0.6) {
      reasons.push(`Compatible experience levels`);
    }

    // Availability compatibility
    const availabilitySimilarity = this.vectorSimilarity(
      userVector.features.availabilityVector,
      candidateVector.features.availabilityVector,
    );
    if (availabilitySimilarity > 0.5) {
      reasons.push(`Matching availability`);
    }

    // High reputation
    const reputationSum = candidateVector.features.reputationVector.reduce(
      (sum, val) => sum + val,
      0,
    );
    if (reputationSum > 2) {
      reasons.push(`High reputation score`);
    }

    return reasons.length > 0 ? reasons : ['General compatibility'];
  }

  updateProfile(userId: string): void {
    // Remove from cache to force refresh on next access
    this.featureVectorCache.delete(userId);
    this.logger.log(`Profile cache cleared for user ${userId}`);
  }

  async getMatchingStats(): Promise<{
    totalProfiles: number;
    mentors: number;
    mentees: number;
    lastCacheUpdate: Date;
    avgQualityScore: number;
  }> {
    await this.refreshFeatureVectors();

    const vectors = Array.from(this.featureVectorCache.values());
    const mentors = vectors.filter((v) => v.userType === 'mentor').length;
    const mentees = vectors.filter((v) => v.userType === 'mentee').length;

    const totalQuality = vectors.reduce(
      (sum, v) => sum + v.metadata.qualityScore,
      0,
    );
    const avgQualityScore =
      vectors.length > 0 ? totalQuality / vectors.length : 0;

    return {
      totalProfiles: vectors.length,
      mentors,
      mentees,
      lastCacheUpdate: this.lastCacheUpdate,
      avgQualityScore,
    };
  }
}
