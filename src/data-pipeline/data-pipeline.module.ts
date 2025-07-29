import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { PipelineExecution } from './entities/pipeline-execution.entity';
import { FeatureVector } from './entities/feature-vector.entity';
import { User } from '../user/entities/user.entity';
import { Feedback } from '../user/entities/feedback.entity';
import { MenteePreference } from '../mentee-preference/entities/mentee-preference.entity';
import { MatchingProfile } from 'src/mentee-preference/entities/matching-profile.entity';
import { DataExtractionService } from './services/data-extraction.service';
import { DataTransformationService } from './services/data-transformation.service';
import { DataLoadingService } from './services/data-loading.service';
import { PipelineOrchestratorService } from './services/pipeline-orchestrator.service';
import { PipelineMonitoringService } from './services/pipeline-monitoring.service';
import { DataPipelineController } from './controllers/data-pipeline.controller';
import { RedisModule } from '../redis/redis.module';
import { CustomLogger } from 'src/logging/services/custom-logger.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PipelineExecution,
      FeatureVector,
      User,
      Feedback,
      MenteePreference,
      MatchingProfile,
    ]),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    ScheduleModule.forRoot(),
    HttpModule,
    RedisModule,
  ],
  controllers: [DataPipelineController],
  providers: [
    DataExtractionService,
    DataTransformationService,
    DataLoadingService,
    PipelineOrchestratorService,
    PipelineMonitoringService,
    CustomLogger,
  ],
  exports: [
    DataExtractionService,
    DataTransformationService,
    DataLoadingService,
    PipelineOrchestratorService,
    PipelineMonitoringService,
  ],
})
export class DataPipelineModule {}
