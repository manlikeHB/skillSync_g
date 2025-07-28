import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Recommendation } from '../entities/recommendation.entity';
import { MatchingAlgorithmService } from './matching-algorithm.service';
import { ExplanationService } from './explanation.service';
import { RecommendationRequestDto } from '../dto/recommendation-request.dto';
import { RecommendationsListDto, RecommendationResponseDto } from '../dto/recommendation-response.dto';

@Injectable()
export class RecommendationService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Recommendation)
    private readonly recommendationRepository: Repository<Recommendation>,
    private readonly matchingAlgorithmService: MatchingAlgorithmService,
    private readonly explanationService: ExplanationService,
  ) {}

  async generateRecommendations(
    request: RecommendationRequestDto
  ): Promise<RecommendationsListDto> {
    const requester = await this.userRepository.findOne({
      where: { id: request.userId }
    });

    if (!requester) {
      throw new Error('Requester not found');
    }

    // Get potential candidates
    const candidates = await this.findCandidates(requester, request);
    
    // Calculate matches and explanations
    const recommendations = await Promise.all(
      candidates.map(async (candidate) => {
        const { score, factors } = this.matchingAlgorithmService.calculateMatch(
          requester,
          candidate,
          request.type
        );

        const explanation = this.explanationService.generateExplanation(
          requester,
          candidate,
          score,
          factors,
          request.type
        );

        // Save recommendation to database
        const recommendation = await this.saveRecommendation(
          requester.id,
          candidate.id,
          request.type,
          score,
          explanation,
          factors
        );

        return {
          user: {
            id: candidate.id,
            name: candidate.name,
            title: candidate.title,
            skills: candidate.skills,
            industry: candidate.industry,
            experienceYears: candidate.experienceYears,
            location: candidate.location,
          },
          explanation,
          recommendedAt: recommendation.createdAt,
          recommendationId: recommendation.id,
        };
      })
    );

    // Sort by match score and limit results
    const sortedRecommendations = recommendations
      .sort((a, b) => b.explanation.matchScore - a.explanation.matchScore)
      .slice(0, request.limit);

    return {
      recommendations: sortedRecommendations,
      totalMatches: candidates.length,
      searchCriteria: request,
      generatedAt: new Date(),
    };
  }

  private async findCandidates(
    requester: User,
    request: RecommendationRequestDto
  ): Promise<User[]> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');
    
    // Exclude the requester
    queryBuilder.where('user.id != :requesterId', { requesterId: requester.id });
    
    // Only active users available for mentoring
    queryBuilder.andWhere('user.isActive = :isActive', { isActive: true });
    queryBuilder.andWhere('user.isAvailableForMentoring = :isAvailable', { isAvailable: true });

    // Filter by experience level based on type
    if (request.type === 'mentor') {
      queryBuilder.andWhere('user.experienceYears > :minExp', { 
        minExp: requester.experienceYears 
      });
    } else {
      queryBuilder.andWhere('user.experienceYears < :maxExp', { 
        maxExp: requester.experienceYears + 10 
      });
    }

    // Optional filters
    if (request.skills && request.skills.length > 0) {
      queryBuilder.andWhere('JSON_OVERLAPS(user.skills, :skills)', {
        skills: JSON.stringify(request.skills)
      });
    }

    if (request.industries && request.industries.length > 0) {
      queryBuilder.andWhere('user.industry IN (:...industries)', {
        industries: request.industries
      });
    }

    return queryBuilder.getMany();
  }

  private async saveRecommendation(
    requesterId: string,
    recommendedUserId: string,
    type: 'mentor' | 'mentee',
    matchScore: number,
    explanation: any,
    matchingFactors: any
  ): Promise<Recommendation> {
    const recommendation = this.recommendationRepository.create({
      requesterId,
      recommendedUserId,
      type,
      matchScore,
      explanation,
      matchingFactors,
    });

    return this.recommendationRepository.save(recommendation);
  }

  async getRecommendationExplanation(recommendationId: string): Promise<any> {
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
    };
  }

  async provideFeedback(recommendationId: string, feedback: string): Promise<void> {
    await this.recommendationRepository.update(recommendationId, { feedback });
  }
}