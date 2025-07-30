import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Recommendation } from '../entities/recommendation.entity';
import { CollaborativeFilteringService, CollaborativeFilteringResult } from './collaborative-filtering.service';
import { MatchingAlgorithmService } from './matching-algorithm.service';
import { RecommendationRequestDto } from '../dto/recommendation-request.dto';
import { RecommendationsListDto, RecommendationResponseDto, RecommendedUserDto } from '../dto/recommendation-response.dto';
import { RecommendationExplanationDto, ExplanationFactorDto } from '../dto/explanation.dto';

export interface HybridRecommendationResult {
  userId: string;
  name: string;
  skills: string[];
  hybridScore: number;
  collaborativeFilteringScore: number;
  contentBasedScore: number;
  confidence: number;
  reasons: string[];
  algorithm: 'hybrid';
  metadata: {
    cfAlgorithm: string;
    similarityScore: number;
    feedbackScore: number;
    preferenceScore: number;
    historicalSuccess: number;
  };
}

export interface HybridRecommendationConfig {
  cfWeight: number;
  cbWeight: number;
  minConfidence: number;
  enableFallback: boolean;
}

@Injectable()
export class HybridRecommendationService {
  private readonly logger = new Logger(HybridRecommendationService.name);
  private readonly defaultConfig: HybridRecommendationConfig = {
    cfWeight: 0.6,
    cbWeight: 0.4,
    minConfidence: 0.3,
    enableFallback: true
  };

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Recommendation)
    private readonly recommendationRepository: Repository<Recommendation>,
    private readonly collaborativeFilteringService: CollaborativeFilteringService,
    private readonly matchingAlgorithmService: MatchingAlgorithmService,
  ) {}

  /**
   * Generate hybrid recommendations combining collaborative filtering and content-based matching
   */
  async generateHybridRecommendations(
    request: RecommendationRequestDto,
    config: Partial<HybridRecommendationConfig> = {}
  ): Promise<RecommendationsListDto> {
    const finalConfig = { ...this.defaultConfig, ...config };
    this.logger.log(`Generating hybrid recommendations for user ${request.userId} with config:`, finalConfig);

    const startTime = Date.now();

    try {
      // Get the requesting user
      const requester = await this.userRepository.findOne({
        where: { id: request.userId }
      });

      if (!requester) {
        throw new Error('Requester not found');
      }

      // Generate collaborative filtering recommendations
      const cfResults = await this.generateCollaborativeFilteringRecommendations(
        request.userId,
        request.type,
        (request.limit || 10) * 2, // Get more CF results for better combination
        'hybrid'
      );

      // Generate content-based recommendations
      const cbResults = await this.generateContentBasedRecommendations(requester, request);

      // Combine and rank recommendations
      const hybridResults = await this.combineRecommendations(
        cfResults,
        cbResults,
        finalConfig
      );

      // Save recommendations to database
      await this.saveHybridRecommendations(
        request.userId,
        hybridResults,
        request.type
      );

      const executionTime = Date.now() - startTime;

      this.logger.log(`Generated ${hybridResults.length} hybrid recommendations in ${executionTime}ms`);

      return {
        recommendations: hybridResults.map(result => ({
          user: {
            id: result.userId,
            name: result.name,
            title: 'Mentor/Mentee', // Default title
            skills: result.skills,
            industry: 'Technology', // Default industry
            experienceYears: 5, // Default experience
            location: 'Remote', // Default location
          },
          explanation: this.createExplanationDto(result),
          recommendedAt: new Date(),
          recommendationId: result.userId, // Using userId as recommendationId for simplicity
        })),
        totalMatches: hybridResults.length,
        searchCriteria: request,
        generatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error generating hybrid recommendations: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create explanation DTO from hybrid result
   */
  private createExplanationDto(result: HybridRecommendationResult): RecommendationExplanationDto {
    const factors: ExplanationFactorDto[] = [
      {
        factor: 'Collaborative Filtering',
        weight: result.collaborativeFilteringScore,
        explanation: `Based on similar users' successful matches`,
        details: `Score: ${Math.round(result.collaborativeFilteringScore * 100)}%`
      },
      {
        factor: 'Content-Based Matching',
        weight: result.contentBasedScore,
        explanation: `Based on skills and preferences alignment`,
        details: `Score: ${Math.round(result.contentBasedScore * 100)}%`
      }
    ];

    return {
      matchScore: result.hybridScore * 100, // Convert to 0-100 scale
      primaryReason: result.reasons[0] || 'Strong overall compatibility',
      factors,
      concerns: result.confidence < 0.5 ? ['Limited historical data'] : [],
      advantages: result.reasons.slice(1, 3) // Take additional reasons as advantages
    };
  }

  /**
   * Generate collaborative filtering recommendations
   */
  private async generateCollaborativeFilteringRecommendations(
    userId: string,
    userType: 'mentor' | 'mentee',
    limit: number,
    algorithm: 'user-based' | 'item-based' | 'hybrid'
  ): Promise<CollaborativeFilteringResult[]> {
    try {
      return await this.collaborativeFilteringService.generateRecommendations(
        userId,
        userType,
        limit,
        algorithm
      );
    } catch (error) {
      this.logger.warn(`CF recommendations failed, falling back to content-based: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate content-based recommendations
   */
  private async generateContentBasedRecommendations(
    requester: User,
    request: RecommendationRequestDto
  ): Promise<RecommendationResponseDto[]> {
    try {
      // Get potential candidates
      const candidates = await this.findCandidates(requester, request);
      
      // Calculate content-based matches
      const recommendations = await Promise.all(
        candidates.map(async (candidate) => {
          const { score, factors } = this.matchingAlgorithmService.calculateMatch(
            requester,
            candidate,
            request.type
          );

          return {
            user: {
              id: candidate.id,
              name: candidate.name,
              title: 'Mentor/Mentee',
              skills: candidate.skills || [],
              industry: 'Technology',
              experienceYears: 5,
              location: 'Remote',
            },
            explanation: {
              matchScore: score,
              primaryReason: 'Skills and preferences alignment',
              factors: [
                {
                  factor: 'Skills Match',
                  weight: factors.skillsMatch,
                  explanation: 'Shared technical skills',
                  details: `Match: ${Math.round(factors.skillsMatch * 100)}%`
                }
              ],
              concerns: [],
              advantages: ['Strong technical alignment']
            },
            recommendedAt: new Date(),
            recommendationId: candidate.id,
          };
        })
      );

      return recommendations.sort((a, b) => b.explanation.matchScore - a.explanation.matchScore);
    } catch (error) {
      this.logger.warn(`Content-based recommendations failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Combine collaborative filtering and content-based recommendations
   */
  private async combineRecommendations(
    cfResults: CollaborativeFilteringResult[],
    cbResults: RecommendationResponseDto[],
    config: HybridRecommendationConfig
  ): Promise<HybridRecommendationResult[]> {
    const combinedResults = new Map<string, HybridRecommendationResult>();

    // Process collaborative filtering results
    for (const cfResult of cfResults) {
      const user = await this.userRepository.findOne({ where: { id: cfResult.targetUserId } });
      if (!user) continue;

      combinedResults.set(cfResult.targetUserId, {
        userId: cfResult.targetUserId,
        name: user.name,
        skills: user.skills || [],
        hybridScore: cfResult.score * config.cfWeight,
        collaborativeFilteringScore: cfResult.score,
        contentBasedScore: 0,
        confidence: cfResult.confidence,
        reasons: cfResult.reasons,
        algorithm: 'hybrid',
        metadata: {
          cfAlgorithm: cfResult.algorithm,
          similarityScore: cfResult.metadata.similarityScore,
          feedbackScore: cfResult.metadata.feedbackScore,
          preferenceScore: cfResult.metadata.preferenceScore,
          historicalSuccess: cfResult.metadata.historicalSuccess,
        }
      });
    }

    // Process content-based results and combine
    for (const cbResult of cbResults) {
      const existing = combinedResults.get(cbResult.user.id);
      const cbScore = cbResult.explanation.matchScore / 100; // Normalize to 0-1

      if (existing) {
        // Combine with existing CF result
        existing.hybridScore += cbScore * config.cbWeight;
        existing.contentBasedScore = cbScore;
        existing.confidence = Math.max(existing.confidence, 0.5); // Default confidence for CB
        existing.reasons.push('Content-based matching');
      } else {
        // New content-based result
        combinedResults.set(cbResult.user.id, {
          userId: cbResult.user.id,
          name: cbResult.user.name,
          skills: cbResult.user.skills,
          hybridScore: cbScore * config.cbWeight,
          collaborativeFilteringScore: 0,
          contentBasedScore: cbScore,
          confidence: 0.5, // Default confidence for CB
          reasons: ['Content-based matching'],
          algorithm: 'hybrid',
          metadata: {
            cfAlgorithm: 'none',
            similarityScore: 0,
            feedbackScore: 0,
            preferenceScore: 0,
            historicalSuccess: 0,
          }
        });
      }
    }

    // Filter and sort results
    const filteredResults = Array.from(combinedResults.values())
      .filter(result => result.confidence >= config.minConfidence)
      .sort((a, b) => b.hybridScore - a.hybridScore);

    return filteredResults;
  }

  /**
   * Find candidates for content-based matching
   */
  private async findCandidates(
    requester: User,
    request: RecommendationRequestDto
  ): Promise<User[]> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');
    
    // Exclude the requester
    queryBuilder.where('user.id != :requesterId', { requesterId: requester.id });
    
    // Only active users
    queryBuilder.andWhere('user.isActive = :isActive', { isActive: true });

    // Filter by reputation score based on type
    if (request.type === 'mentor') {
      queryBuilder.andWhere('user.reputationScore > :minRep', { 
        minRep: requester.reputationScore 
      });
    } else {
      queryBuilder.andWhere('user.reputationScore < :maxRep', { 
        maxRep: requester.reputationScore + 2 
      });
    }

    // Optional filters
    if (request.skills && request.skills.length > 0) {
      queryBuilder.andWhere('JSON_OVERLAPS(user.skills, :skills)', {
        skills: JSON.stringify(request.skills)
      });
    }

    return queryBuilder.getMany();
  }

  /**
   * Save hybrid recommendations to database
   */
  private async saveHybridRecommendations(
    requesterId: string,
    results: HybridRecommendationResult[],
    type: 'mentor' | 'mentee'
  ): Promise<void> {
    const recommendations = results.map(result => 
      this.recommendationRepository.create({
        requesterId,
        recommendedUserId: result.userId,
        type,
        matchScore: result.hybridScore,
        explanation: {
          reasons: result.reasons,
          confidence: result.confidence,
          algorithm: result.algorithm
        },
        matchingFactors: {
          collaborativeFilteringScore: result.collaborativeFilteringScore,
          contentBasedScore: result.contentBasedScore,
          hybridScore: result.hybridScore,
          metadata: result.metadata
        }
      })
    );

    await this.recommendationRepository.save(recommendations);
  }

  /**
   * Get hybrid recommendation explanation
   */
  async getHybridRecommendationExplanation(recommendationId: string): Promise<any> {
    const recommendation = await this.recommendationRepository.findOne({
      where: { id: recommendationId },
      relations: ['requester', 'recommendedUser']
    });

    if (!recommendation) {
      throw new Error('Recommendation not found');
    }

    return {
      recommendation,
      explanation: recommendation.explanation,
      matchingFactors: recommendation.matchingFactors,
      algorithm: 'hybrid'
    };
  }

  /**
   * Update hybrid recommendation configuration
   */
  updateConfig(newConfig: Partial<HybridRecommendationConfig>): void {
    Object.assign(this.defaultConfig, newConfig);
    this.logger.log('Updated hybrid recommendation configuration:', this.defaultConfig);
  }

  /**
   * Get current configuration
   */
  getConfig(): HybridRecommendationConfig {
    return { ...this.defaultConfig };
  }
} 