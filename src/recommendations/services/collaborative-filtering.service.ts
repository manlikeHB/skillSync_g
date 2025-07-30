import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { UserRole } from '../../user/enums/user-role.enum';
import { Match, MatchStatus } from '../../user-feedback/entities/match.entity';
import { Feedback } from '../../user-feedback/entities/feedback.entity';
import { MatchingPreferences } from '../../matching/interfaces/matching-data.interface';

export interface UserSimilarity {
  userId: string;
  similarity: number;
  commonMatches: number;
  sharedPreferences: number;
}

export interface CollaborativeFilteringResult {
  targetUserId: string;
  score: number;
  confidence: number;
  reasons: string[];
  algorithm: 'user-based' | 'item-based' | 'hybrid';
  metadata: {
    similarityScore: number;
    feedbackScore: number;
    preferenceScore: number;
    historicalSuccess: number;
  };
}

export interface UserInteractionMatrix {
  [userId: string]: {
    [targetUserId: string]: {
      rating: number;
      feedback: number;
      duration: number;
      success: boolean;
    };
  };
}

@Injectable()
export class CollaborativeFilteringService {
  private readonly logger = new Logger(CollaborativeFilteringService.name);
  private userInteractionMatrix: UserInteractionMatrix = {};
  private userSimilarityCache: Map<string, UserSimilarity[]> = new Map();
  private readonly CACHE_TTL = 3600000; // 1 hour in milliseconds

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
  ) {}

  /**
   * Generate collaborative filtering recommendations
   */
  async generateRecommendations(
    userId: string,
    userType: 'mentor' | 'mentee',
    limit: number = 10,
    algorithm: 'user-based' | 'item-based' | 'hybrid' = 'hybrid'
  ): Promise<CollaborativeFilteringResult[]> {
    this.logger.log(`Generating ${algorithm} CF recommendations for user ${userId}`);

    try {
      // Build interaction matrix
      await this.buildInteractionMatrix();

      let recommendations: CollaborativeFilteringResult[] = [];

      switch (algorithm) {
        case 'user-based':
          recommendations = await this.userBasedCollaborativeFiltering(userId, userType, limit);
          break;
        case 'item-based':
          recommendations = await this.itemBasedCollaborativeFiltering(userId, userType, limit);
          break;
        case 'hybrid':
          recommendations = await this.hybridCollaborativeFiltering(userId, userType, limit);
          break;
      }

      this.logger.log(`Generated ${recommendations.length} recommendations for user ${userId}`);
      return recommendations;
    } catch (error) {
      this.logger.error(`Error generating CF recommendations: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * User-based collaborative filtering
   * Finds users similar to the target user and recommends their successful matches
   */
  private async userBasedCollaborativeFiltering(
    userId: string,
    userType: 'mentor' | 'mentee',
    limit: number
  ): Promise<CollaborativeFilteringResult[]> {
    // Find similar users
    const similarUsers = await this.findSimilarUsers(userId, userType, 20);
    
    // Get successful matches from similar users
    const recommendations = new Map<string, CollaborativeFilteringResult>();
    
    for (const similarUser of similarUsers) {
      const successfulMatches = await this.getSuccessfulMatches(similarUser.userId, userType);
      
      for (const match of successfulMatches) {
        const targetUserId = userType === 'mentor' ? match.menteeId : match.mentorId;
        
        if (targetUserId === userId) continue; // Skip self
        
        const existing = recommendations.get(targetUserId);
        const score = this.calculateUserBasedScore(similarUser, match);
        
        if (!existing || score > existing.score) {
          recommendations.set(targetUserId, {
            targetUserId,
            score,
            confidence: this.calculateConfidence(similarUser.similarity, match),
            reasons: [
              `Similar to ${similarUser.userId} (${Math.round(similarUser.similarity * 100)}% similarity)`,
              `Successful historical match with ${similarUser.similarity > 0.7 ? 'high' : 'moderate'} rating`
            ],
            algorithm: 'user-based',
            metadata: {
              similarityScore: similarUser.similarity,
              feedbackScore: match.algorithmScore || 0,
              preferenceScore: similarUser.sharedPreferences,
              historicalSuccess: this.calculateHistoricalSuccess(match)
            }
          });
        }
      }
    }

    return Array.from(recommendations.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Item-based collaborative filtering
   * Finds mentors/mentees similar to those the user has successfully matched with
   */
  private async itemBasedCollaborativeFiltering(
    userId: string,
    userType: 'mentor' | 'mentee',
    limit: number
  ): Promise<CollaborativeFilteringResult[]> {
    // Get user's successful matches
    const userMatches = await this.getSuccessfulMatches(userId, userType);
    
    if (userMatches.length === 0) {
      return [];
    }

    const recommendations = new Map<string, CollaborativeFilteringResult>();
    
    for (const userMatch of userMatches) {
      const matchedUserId = userType === 'mentor' ? userMatch.menteeId : userMatch.mentorId;
      
      // Find users similar to the matched user
      const similarUsers = await this.findSimilarUsers(matchedUserId, userType === 'mentor' ? 'mentee' : 'mentor', 10);
      
      for (const similarUser of similarUsers) {
        if (similarUser.userId === userId) continue; // Skip self
        
        const existing = recommendations.get(similarUser.userId);
        const score = this.calculateItemBasedScore(userMatch, similarUser);
        
        if (!existing || score > existing.score) {
          recommendations.set(similarUser.userId, {
            targetUserId: similarUser.userId,
            score,
            confidence: this.calculateConfidence(similarUser.similarity, userMatch),
            reasons: [
              `Similar to your successful match (${Math.round(similarUser.similarity * 100)}% similarity)`,
              `Based on your positive experience with similar profile`
            ],
            algorithm: 'item-based',
            metadata: {
              similarityScore: similarUser.similarity,
              feedbackScore: userMatch.algorithmScore || 0,
              preferenceScore: similarUser.sharedPreferences,
              historicalSuccess: this.calculateHistoricalSuccess(userMatch)
            }
          });
        }
      }
    }

    return Array.from(recommendations.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Hybrid collaborative filtering
   * Combines user-based and item-based approaches
   */
  private async hybridCollaborativeFiltering(
    userId: string,
    userType: 'mentor' | 'mentee',
    limit: number
  ): Promise<CollaborativeFilteringResult[]> {
    const [userBasedResults, itemBasedResults] = await Promise.all([
      this.userBasedCollaborativeFiltering(userId, userType, limit * 2),
      this.itemBasedCollaborativeFiltering(userId, userType, limit * 2)
    ]);

    // Combine and weight the results
    const combinedResults = new Map<string, CollaborativeFilteringResult>();
    
    // Add user-based results with weight 0.6
    for (const result of userBasedResults) {
      const weightedScore = result.score * 0.6;
      combinedResults.set(result.targetUserId, {
        ...result,
        score: weightedScore,
        algorithm: 'hybrid',
        reasons: [...result.reasons, 'User-based collaborative filtering']
      });
    }
    
    // Add item-based results with weight 0.4
    for (const result of itemBasedResults) {
      const existing = combinedResults.get(result.targetUserId);
      const weightedScore = result.score * 0.4;
      
      if (existing) {
        existing.score += weightedScore;
        existing.reasons.push('Item-based collaborative filtering');
        existing.metadata.similarityScore = (existing.metadata.similarityScore + result.metadata.similarityScore) / 2;
      } else {
        combinedResults.set(result.targetUserId, {
          ...result,
          score: weightedScore,
          algorithm: 'hybrid',
          reasons: [...result.reasons, 'Item-based collaborative filtering']
        });
      }
    }

    return Array.from(combinedResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Find users similar to the target user
   */
  private async findSimilarUsers(
    userId: string,
    userType: 'mentor' | 'mentee',
    limit: number
  ): Promise<UserSimilarity[]> {
    const cacheKey = `${userId}-${userType}`;
    const cached = this.userSimilarityCache.get(cacheKey);
    
    if (cached) {
      return cached.slice(0, limit);
    }

    const targetUser = await this.userRepository.findOne({ where: { id: userId } });
    if (!targetUser) {
      return [];
    }

    // Get all users of the opposite type
    const oppositeType = userType === 'mentor' ? UserRole.MENTEE : UserRole.MENTOR;
    const candidates = await this.userRepository.find({
      where: { role: oppositeType }
    });

    const similarities: UserSimilarity[] = [];

    for (const candidate of candidates) {
      if (candidate.id === userId) continue;

      const similarity = await this.calculateUserSimilarity(targetUser, candidate);
      
      if (similarity.similarity > 0.1) { // Minimum similarity threshold
        similarities.push(similarity);
      }
    }

    // Sort by similarity and cache
    similarities.sort((a, b) => b.similarity - a.similarity);
    this.userSimilarityCache.set(cacheKey, similarities);

    return similarities.slice(0, limit);
  }

  /**
   * Calculate similarity between two users
   */
  private async calculateUserSimilarity(user1: User, user2: User): Promise<UserSimilarity> {
    let similarity = 0;
    let commonMatches = 0;
    let sharedPreferences = 0;

    // Skills similarity (40% weight)
    const skillsSimilarity = this.calculateSkillsSimilarity(user1.skills || [], user2.skills || []);
    similarity += skillsSimilarity * 0.4;

    // Experience level similarity (20% weight)
    const experienceSimilarity = this.calculateExperienceSimilarity(user1, user2);
    similarity += experienceSimilarity * 0.2;

    // Industry similarity (15% weight) - using bio similarity as proxy
    const industrySimilarity = user1.bio && user2.bio ? 
      this.calculateTextSimilarity(user1.bio, user2.bio) : 0;
    similarity += industrySimilarity * 0.15;

    // Location similarity (10% weight) - using availability as proxy
    const locationSimilarity = this.calculateAvailabilitySimilarity(user1, user2);
    similarity += locationSimilarity * 0.1;

    // Historical interaction similarity (15% weight)
    const interactionSimilarity = await this.calculateInteractionSimilarity(user1.id, user2.id);
    similarity += interactionSimilarity * 0.15;

    // Count common successful matches
    commonMatches = await this.countCommonSuccessfulMatches(user1.id, user2.id);

    // Count shared preferences
    sharedPreferences = this.calculateSharedPreferences(user1, user2);

    return {
      userId: user2.id,
      similarity,
      commonMatches,
      sharedPreferences
    };
  }

  /**
   * Calculate skills similarity using Jaccard similarity
   */
  private calculateSkillsSimilarity(skills1: string[], skills2: string[]): number {
    if (skills1.length === 0 && skills2.length === 0) return 1;
    if (skills1.length === 0 || skills2.length === 0) return 0;

    const set1 = new Set(skills1);
    const set2 = new Set(skills2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Calculate experience level similarity based on reputation score
   */
  private calculateExperienceSimilarity(user1: User, user2: User): number {
    const rep1 = user1.reputationScore || 0;
    const rep2 = user2.reputationScore || 0;
    
    const diff = Math.abs(rep1 - rep2);
    const maxRep = Math.max(rep1, rep2);
    
    return maxRep === 0 ? 1 : Math.max(0, 1 - diff / maxRep);
  }

  /**
   * Calculate text similarity using simple string comparison
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Calculate availability similarity
   */
  private calculateAvailabilitySimilarity(user1: User, user2: User): number {
    const avail1 = user1.availability || '';
    const avail2 = user2.availability || '';
    
    if (!avail1 || !avail2) return 0.5; // Neutral if availability not specified
    
    return avail1.toLowerCase() === avail2.toLowerCase() ? 1 : 0;
  }

  /**
   * Calculate interaction similarity based on historical feedback
   */
  private async calculateInteractionSimilarity(userId1: string, userId2: string): Promise<number> {
    const interactions = await this.feedbackRepository.find({
      where: [
        { reviewerId: userId1 },
        { reviewerId: userId2 }
      ],
      relations: ['match']
    });

    if (interactions.length === 0) return 0;

    // Calculate average rating similarity
    const user1Ratings = interactions
      .filter(f => f.reviewerId === userId1)
      .map(f => f.rating);
    
    const user2Ratings = interactions
      .filter(f => f.reviewerId === userId2)
      .map(f => f.rating);

    if (user1Ratings.length === 0 || user2Ratings.length === 0) return 0;

    const avgRating1 = user1Ratings.reduce((a, b) => a + b, 0) / user1Ratings.length;
    const avgRating2 = user2Ratings.reduce((a, b) => a + b, 0) / user2Ratings.length;

    const ratingDiff = Math.abs(avgRating1 - avgRating2);
    return Math.max(0, 1 - ratingDiff / 5); // Normalize to 0-1
  }

  /**
   * Count common successful matches between two users
   */
  private async countCommonSuccessfulMatches(userId1: string, userId2: string): Promise<number> {
    const matches1 = await this.matchRepository.find({
      where: [
        { mentorId: userId1, status: MatchStatus.COMPLETED },
        { menteeId: userId1, status: MatchStatus.COMPLETED }
      ]
    });

    const matches2 = await this.matchRepository.find({
      where: [
        { mentorId: userId2, status: MatchStatus.COMPLETED },
        { menteeId: userId2, status: MatchStatus.COMPLETED }
      ]
    });

    const matchIds1 = new Set(matches1.map(m => m.id));
    const matchIds2 = new Set(matches2.map(m => m.id));

    return [...matchIds1].filter(id => matchIds2.has(id)).length;
  }

  /**
   * Calculate shared preferences between users
   */
  private calculateSharedPreferences(user1: User, user2: User): number {
    // This can be enhanced with more sophisticated preference matching
    // For now, using a simple approach based on available data
    let sharedCount = 0;
    let totalCount = 0;

    // Skills preferences
    const skills1 = user1.skills || [];
    const skills2 = user2.skills || [];
    const sharedSkills = skills1.filter(s => skills2.includes(s));
    sharedCount += sharedSkills.length;
    totalCount += Math.max(skills1.length, skills2.length);

    // Bio preference (as proxy for industry/background)
    if (user1.bio && user2.bio) {
      const bioSimilarity = this.calculateTextSimilarity(user1.bio, user2.bio);
      if (bioSimilarity > 0.3) {
        sharedCount += 1;
      }
    }
    totalCount += 1;

    return totalCount > 0 ? sharedCount / totalCount : 0;
  }

  /**
   * Get successful matches for a user
   */
  private async getSuccessfulMatches(userId: string, userType: 'mentor' | 'mentee'): Promise<Match[]> {
    const whereCondition = userType === 'mentor' 
      ? { mentorId: userId, status: MatchStatus.COMPLETED }
      : { menteeId: userId, status: MatchStatus.COMPLETED };

    return await this.matchRepository.find({
      where: whereCondition,
      relations: ['feedback'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Calculate user-based recommendation score
   */
  private calculateUserBasedScore(similarUser: UserSimilarity, match: Match): number {
    const baseScore = similarUser.similarity;
    const feedbackBonus = (match.algorithmScore || 0) * 0.3;
    const commonMatchesBonus = Math.min(similarUser.commonMatches * 0.1, 0.2);
    const sharedPreferencesBonus = similarUser.sharedPreferences * 0.2;

    return Math.min(1, baseScore + feedbackBonus + commonMatchesBonus + sharedPreferencesBonus);
  }

  /**
   * Calculate item-based recommendation score
   */
  private calculateItemBasedScore(userMatch: Match, similarUser: UserSimilarity): number {
    const baseScore = similarUser.similarity;
    const matchQualityBonus = (userMatch.algorithmScore || 0) * 0.4;
    const sharedPreferencesBonus = similarUser.sharedPreferences * 0.3;

    return Math.min(1, baseScore + matchQualityBonus + sharedPreferencesBonus);
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(similarity: number, match: Match): number {
    const similarityConfidence = similarity * 0.4;
    const feedbackConfidence = (match.algorithmScore || 0) * 0.3;
    const historicalConfidence = this.calculateHistoricalSuccess(match) * 0.3;

    return Math.min(1, similarityConfidence + feedbackConfidence + historicalConfidence);
  }

  /**
   * Calculate historical success rate
   */
  private calculateHistoricalSuccess(match: Match): number {
    if (!match.feedback || match.feedback.length === 0) return 0.5;

    const positiveFeedback = match.feedback.filter(f => f.rating >= 4).length;
    return positiveFeedback / match.feedback.length;
  }

  /**
   * Build user interaction matrix from historical data
   */
  private async buildInteractionMatrix(): Promise<void> {
    this.logger.log('Building user interaction matrix...');

    const matches = await this.matchRepository.find({
      relations: ['feedback'],
      where: { status: MatchStatus.COMPLETED }
    });

    this.userInteractionMatrix = {};

    for (const match of matches) {
      const mentorId = match.mentorId;
      const menteeId = match.menteeId;

      // Initialize if not exists
      if (!this.userInteractionMatrix[mentorId]) {
        this.userInteractionMatrix[mentorId] = {};
      }
      if (!this.userInteractionMatrix[menteeId]) {
        this.userInteractionMatrix[menteeId] = {};
      }

      // Calculate interaction score
      const avgRating = match.feedback.length > 0 
        ? match.feedback.reduce((sum, f) => sum + f.rating, 0) / match.feedback.length
        : 3; // Default neutral rating

      const duration = match.endDate && match.startDate
        ? (new Date(match.endDate).getTime() - new Date(match.startDate).getTime()) / (1000 * 60 * 60 * 24) // Days
        : 30; // Default 30 days

      const success = avgRating >= 4;

      // Store interaction data
      this.userInteractionMatrix[mentorId][menteeId] = {
        rating: avgRating,
        feedback: match.feedback.length,
        duration,
        success
      };

      this.userInteractionMatrix[menteeId][mentorId] = {
        rating: avgRating,
        feedback: match.feedback.length,
        duration,
        success
      };
    }

    this.logger.log(`Built interaction matrix with ${Object.keys(this.userInteractionMatrix).length} users`);
  }

  /**
   * Clear similarity cache
   */
  clearCache(): void {
    this.userSimilarityCache.clear();
    this.logger.log('Collaborative filtering cache cleared');
  }

  /**
   * Get algorithm statistics
   */
  async getAlgorithmStats(): Promise<{
    totalUsers: number;
    totalMatches: number;
    totalFeedback: number;
    averageRating: number;
    cacheSize: number;
  }> {
    const [totalUsers, totalMatches, totalFeedback] = await Promise.all([
      this.userRepository.count(),
      this.matchRepository.count(),
      this.feedbackRepository.count()
    ]);

    const feedback = await this.feedbackRepository.find();
    const averageRating = feedback.length > 0
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
      : 0;

    return {
      totalUsers,
      totalMatches,
      totalFeedback,
      averageRating,
      cacheSize: this.userSimilarityCache.size
    };
  }
} 