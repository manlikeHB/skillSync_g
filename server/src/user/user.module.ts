import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { Feedback } from './entities/feedback.entity';
import { ReputationService } from './services/reputation.service';
import { FeedbackController } from './controllers/feedback.controller';
import { ReputationAdminController } from './controllers/reputation-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Feedback])],
  controllers: [UserController, FeedbackController, ReputationAdminController],
  providers: [UserService, ReputationService],
  exports: [UserService],
})
export class UserModule {}
