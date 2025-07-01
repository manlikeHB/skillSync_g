import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Feedback } from './entities/feedback.entity';
import { UserController } from './controllers/user.controller';
import { FeedbackController } from './controllers/feedback.controller';
import { ReputationAdminController } from './controllers/reputation-admin.controller';
import { UserService } from './services/user.service';
import { ReputationService } from './services/reputation.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Feedback])],
  controllers: [UserController, FeedbackController, ReputationAdminController],
  providers: [UserService, ReputationService],
  exports: [UserService],
})
export class UserModule {}
