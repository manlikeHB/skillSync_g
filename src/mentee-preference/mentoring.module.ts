import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { MenteePreference } from './entities/mentee-preference.entity';
import { MatchingProfile } from './entities/matching-profile.entity';
import { MenteePreferenceService } from './services/mentee-preference.service';
import { RecommendationService } from './services/recommendation.service';
import { MenteePreferenceController } from './controllers/mentee-preference.controller';
import { RecommendationController } from './controllers/recommendation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      MenteePreference,
      MatchingProfile
    ])
  ],
  controllers: [
    MenteePreferenceController,
    RecommendationController
  ],
  providers: [
    MenteePreferenceService,
    RecommendationService
  ],
  exports: [
    MenteePreferenceService,
    RecommendationService
  ]
})
export class MentoringModule {}
