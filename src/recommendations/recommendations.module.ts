import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommendationController } from './controllers/recommendation.controller';
import { RecommendationService } from './services/recommendation.service';
import { MatchingAlgorithmService } from './services/matching-algorithm.service';
import { ExplanationService } from './services/explanation.service';
import { CollaborativeFilteringService } from './services/collaborative-filtering.service';
import { HybridRecommendationService } from './services/hybrid-recommendation.service';
import { CollaborativeFilteringController } from './controllers/collaborative-filtering.controller';
import { Recommendation } from './entities/recommendation.entity';
import { User } from '../user/entities/user.entity';
import { Match } from '../user-feedback/entities/match.entity';
import { Feedback } from '../user-feedback/entities/feedback.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recommendation, User, Match, Feedback])
  ],
  controllers: [RecommendationController, CollaborativeFilteringController],
  providers: [
    RecommendationService,
    MatchingAlgorithmService,
    ExplanationService,
    CollaborativeFilteringService,
    HybridRecommendationService,
  ],
  exports: [RecommendationService, CollaborativeFilteringService, HybridRecommendationService],
})
export class RecommendationsModule {}