import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchingController } from './controllers/matching.controller';
import { MatchingService } from './services/matching.service';
import { FairnessAnalyzerService } from './services/fairness-analyzer.service';
import { User } from './entities/user.entity';
import { Matching } from './entities/matching.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Matching]),
  ],
  controllers: [MatchingController],
  providers: [MatchingService, FairnessAnalyzerService],
  exports: [MatchingService, FairnessAnalyzerService],
})
export class MatchingModule {}
