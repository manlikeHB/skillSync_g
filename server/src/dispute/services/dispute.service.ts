import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute, DisputeStatus } from '../entities/dispute.entity';
import { DisputeEvidence } from '../entities/dispute-evidence.entity';
import { DisputeAuditLog } from '../entities/dispute-audit-log.entity';
import { User } from '../../user/entities/user.entity';
import { CreateDisputeDto } from '../dto/create-dispute.dto';

@Injectable()
export class DisputeService {
  constructor(
    @InjectRepository(Dispute)
    private disputeRepo: Repository<Dispute>,
    @InjectRepository(DisputeEvidence)
    private evidenceRepo: Repository<DisputeEvidence>,
    @InjectRepository(DisputeAuditLog)
    private auditRepo: Repository<DisputeAuditLog>,
  ) {}

  async createDispute(dto: CreateDisputeDto, user: User) {
    const dispute = this.disputeRepo.create({
      contractId: dto.contractId,
      reason: dto.reason,
      initiator: user,
      status: DisputeStatus.PENDING,
    });
    await this.disputeRepo.save(dispute);
    if (dto.evidenceDescription || dto.attachmentUrl) {
      const evidence = this.evidenceRepo.create({
        dispute,
        description: dto.evidenceDescription,
        attachmentUrl: dto.attachmentUrl,
      });
      await this.evidenceRepo.save(evidence);
    }
    await this.auditRepo.save(this.auditRepo.create({
      dispute,
      actor: user,
      action: 'created',
      details: { reason: dto.reason },
    }));
    return dispute;
  }

  async getDispute(id: string, user: User) {
    const dispute = await this.disputeRepo.findOne({
      where: { id },
      relations: ['evidence', 'votes', 'auditLogs', 'initiator'],
    });
    if (!dispute) throw new NotFoundException('Dispute not found');
    // Add access control as needed
    return dispute;
  }

  // More methods for voting, status updates, etc. would go here
}
