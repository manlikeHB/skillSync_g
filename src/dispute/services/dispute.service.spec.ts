import { Test, TestingModule } from '@nestjs/testing';
import { DisputeService } from './dispute.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Dispute } from '../entities/dispute.entity';
import { DisputeEvidence } from '../entities/dispute-evidence.entity';
import { DisputeAuditLog } from '../entities/dispute-audit-log.entity';

const mockRepo = () => ({ create: jest.fn(), save: jest.fn(), findOne: jest.fn() });

describe('DisputeService', () => {
  let service: DisputeService;
  let disputeRepo, evidenceRepo, auditRepo;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputeService,
        { provide: getRepositoryToken(Dispute), useFactory: mockRepo },
        { provide: getRepositoryToken(DisputeEvidence), useFactory: mockRepo },
        { provide: getRepositoryToken(DisputeAuditLog), useFactory: mockRepo },
      ],
    }).compile();
    service = module.get<DisputeService>(DisputeService);
    disputeRepo = module.get(getRepositoryToken(Dispute));
    evidenceRepo = module.get(getRepositoryToken(DisputeEvidence));
    auditRepo = module.get(getRepositoryToken(DisputeAuditLog));
  });

  it('should create a dispute and evidence', async () => {
    disputeRepo.create.mockReturnValue({ id: 'd1' });
    disputeRepo.save.mockResolvedValue({ id: 'd1' });
    evidenceRepo.create.mockReturnValue({ id: 'e1' });
    evidenceRepo.save.mockResolvedValue({ id: 'e1' });
    auditRepo.create.mockReturnValue({});
    auditRepo.save.mockResolvedValue({});
    const dto = { contractId: 'c1', reason: 'test', evidenceDescription: 'desc', attachmentUrl: 'url' };
    const user = { id: 'u1' };
    await service.createDispute(dto, user as any);
    expect(disputeRepo.create).toHaveBeenCalled();
    expect(evidenceRepo.create).toHaveBeenCalled();
    expect(auditRepo.create).toHaveBeenCalled();
  });
});
