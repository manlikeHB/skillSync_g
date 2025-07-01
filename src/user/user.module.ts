import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Feedback } from './entities/feedback.entity';
import { UserController } from './controllers/user.controller';
import { FeedbackController } from './controllers/feedback.controller';
import { ReputationAdminController } from './controllers/reputation-admin.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { UserService } from './services/user.service';
import { ReputationService } from './services/reputation.service';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [TypeOrmModule.forFeature([User, Feedback]), ThrottlerModule.forRoot({
    throttlers: [
      {
        ttl: 60000, // 1 minute in ms
        limit: 5,   // 5 requests per minute per user
      },
    ],
  })],
  controllers: [UserController, FeedbackController, ReputationAdminController, AnalyticsController],
  providers: [UserService, ReputationService],
  exports: [UserService],
})
export class UserModule {}
