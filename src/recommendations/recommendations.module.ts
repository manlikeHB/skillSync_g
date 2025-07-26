import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommendationController } from './controllers/recommendation.controller';
import { RecommendationService } from './services/recommendation.service';
import { MatchingAlgorithmService } from './services/matching-algorithm.service';
import { ExplanationService } from './services/explanation.service';
import { Recommendation } from './entities/recommendation.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recommendation, User])
  ],
  controllers: [RecommendationController],
  providers: [
    RecommendationService,
    MatchingAlgorithmService,
    ExplanationService,
  ],
  exports: [RecommendationService],
})
export class RecommendationsModule {}