import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute, DisputeStatus } from '../entities/dispute.entity';
import { DisputeVote } from '../entities/dispute-vote.entity';
import { DisputeAuditLog } from '../entities/dispute-audit-log.entity';
import { User } from '../../user/entities/user.entity';
import { CastVoteDto } from '../dto/cast-vote.dto';

const QUORUM = 3;
const MAJORITY = 2; // For 3 voters
const ALLOWED_ROLES = ['admin', 'arbitrator'];

@Injectable()
export class DisputeVotingService {
  constructor(
    @InjectRepository(Dispute)
    private disputeRepo: Repository<Dispute>,
    @InjectRepository(DisputeVote)
    private voteRepo: Repository<DisputeVote>,
    @InjectRepository(DisputeAuditLog)
    private auditRepo: Repository<DisputeAuditLog>,
  ) {}

  async castVote(disputeId: string, user: User, dto: CastVoteDto) {
    const dispute = await this.disputeRepo.findOne({ where: { id: disputeId }, relations: ['votes'] });
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (![DisputeStatus.PENDING, DisputeStatus.UNDER_REVIEW].includes(dispute.status)) {
      throw new BadRequestException('Voting is closed for this dispute');
    }
    if (!ALLOWED_ROLES.includes(user.role)) {
      throw new ForbiddenException('Not authorized to vote');
    }
    const alreadyVoted = dispute.votes.find((v) => v.voter.id === user.id);
    if (alreadyVoted) throw new BadRequestException('You have already voted');
    const vote = this.voteRepo.create({
      dispute,
      voter: user,
      decision: dto.decision,
      justification: dto.justification,
    });
    await this.voteRepo.save(vote);
    await this.auditRepo.save(this.auditRepo.create({
      dispute,
      actor: user,
      action: 'voted',
      details: { decision: dto.decision },
    }));
    // Check for quorum and majority
    const allVotes = await this.voteRepo.find({ where: { dispute: { id: disputeId } } });
    if (allVotes.length >= QUORUM) {
      const decisionCounts = allVotes.reduce((acc, v) => {
        acc[v.decision] = (acc[v.decision] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const [winningDecision, count] = Object.entries(decisionCounts).sort((a, b) => b[1] - a[1])[0];
      if (count >= MAJORITY) {
        dispute.status = DisputeStatus.RESOLVED;
        dispute.outcome = { decision: winningDecision };
        await this.disputeRepo.save(dispute);
        await this.auditRepo.save(this.auditRepo.create({
          dispute,
          actor: user,
          action: 'resolved',
          details: { decision: winningDecision },
        }));
      }
    }
    return { success: true };
  }
}
