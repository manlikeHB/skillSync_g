import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback, FeedbackType } from '../entities/feedback.entity';
import { Match, MatchStatus } from '../entities/match.entity';
import { CreateFeedbackDto } from '../dto/feedback/create-feedback.dto';
import { FeedbackSummaryDto } from '../dto/feedback/feedback-summary.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
  ) {}

  async createFeedback(userId: string, createFeedbackDto: CreateFeedbackDto): Promise<Feedback> {
    const match = await this.matchRepository.findOne({
      where: { id: createFeedbackDto.matchId },
      relations: ['mentor', 'mentee'],
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // Verify user is part of this match
    if (match.mentorId !== userId && match.menteeId !== userId) {
      throw new BadRequestException('User is not part of this match');
    }

    // Check if feedback already exists for this type
    const existingFeedback = await this.feedbackRepository.findOne({
      where: {
        matchId: createFeedbackDto.matchId,
        reviewerId: userId,
        type: createFeedbackDto.type,
      },
    });

    if (existingFeedback) {
      throw new BadRequestException('Feedback already provided for this type');
    }

    const feedback = this.feedbackRepository.create({
      ...createFeedbackDto,
      reviewerId: userId,
    });

    return this.feedbackRepository.save(feedback);
  }

  async getFeedbackSummary(matchId: string): Promise<FeedbackSummaryDto> {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const feedback = await this.feedbackRepository.find({
      where: { matchId },
    });

    const totalFeedbackCount = feedback.length;
    const averageRating = totalFeedbackCount > 0 
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedbackCount 
      : 0;

    // Group feedback by type
    const feedbackByType = Object.values(FeedbackType).reduce((acc, type) => {
      const typeFeedback = feedback.filter(f => f.type === type);
      acc[type] = {
        count: typeFeedback.length,
        average: typeFeedback.length > 0 
          ? typeFeedback.reduce((sum, f) => sum + f.rating, 0) / typeFeedback.length 
          : 0,
      };
      return acc;
    }, {} as Record<FeedbackType, { average: number; count: number }>);

    // Extract common tags
    const allTags = feedback.flatMap(f => f.tags || []);
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate specific metrics
    const specificMetrics = this.calculateSpecificMetrics(feedback);

    return {
      matchId,
      averageRating,
      totalFeedbackCount,
      feedbackByType,
      commonTags,
      specificMetrics,
    };
  }

  private calculateSpecificMetrics(feedback: Feedback[]) {
    const feedbackWithSpecific = feedback.filter(f => f.specificFeedback);
    const count = feedbackWithSpecific.length;

    if (count === 0) {
      return {
        skillsMatchRate: 0,
        communicationEffectiveness: 0,
        goalAlignment: 0,
        timeCommitmentRate: 0,
        recommendationRate: 0,
      };
    }

    return {
      skillsMatchRate: feedbackWithSpecific.filter(f => f.specificFeedback.skillsMatched).length / count,
      communicationEffectiveness: feedbackWithSpecific.filter(f => f.specificFeedback.communicationEffective).length / count,
      goalAlignment: feedbackWithSpecific.filter(f => f.specificFeedback.goalsAligned).length / count,
      timeCommitmentRate: feedbackWithSpecific.filter(f => f.specificFeedback.timeCommitmentMet).length / count,
      recommendationRate: feedbackWithSpecific.filter(f => f.specificFeedback.wouldRecommend).length / count,
    };
  }

  async getFeedbackForMatch(matchId: string, includeAnonymous: boolean = true): Promise<Feedback[]> {
    const whereCondition: any = { matchId };
    
    if (!includeAnonymous) {
      whereCondition.isAnonymous = false;
    }

    return this.feedbackRepository.find({
      where: whereCondition,
      relations: ['reviewer'],
      order: { createdAt: 'DESC' },
    });
  }

  async getUserFeedbackHistory(userId: string): Promise<Feedback[]> {
    return this.feedbackRepository.find({
      where: { reviewerId: userId },
      relations: ['match', 'match.mentor', 'match.mentee'],
      order: { createdAt: 'DESC' },
    });
  }
}