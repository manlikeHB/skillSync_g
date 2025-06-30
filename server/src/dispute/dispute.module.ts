import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dispute } from './entities/dispute.entity';
import { DisputeEvidence } from './entities/dispute-evidence.entity';
import { DisputeVote } from './entities/dispute-vote.entity';
import { DisputeAuditLog } from './entities/dispute-audit-log.entity';
import { DisputeService } from './services/dispute.service';
import { DisputeController } from './controllers/dispute.controller';
import { DisputeVotingService } from './services/dispute-voting.service';
import { DisputeVotingController } from './controllers/dispute-voting.controller';

@Module({
  imports: [TypeOrmModule.forFeature([
    Dispute, DisputeEvidence, DisputeVote, DisputeAuditLog
  ])],
  controllers: [DisputeController, DisputeVotingController],
  providers: [DisputeService, DisputeVotingService],
  exports: [DisputeService, DisputeVotingService],
})
export class DisputeModule {}
