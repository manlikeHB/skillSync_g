import { Test, TestingModule } from '@nestjs/testing';
import { DisputeVotingService } from './dispute-voting.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Dispute } from '../entities/dispute.entity';
import { DisputeVote } from '../entities/dispute-vote.entity';
import { DisputeAuditLog } from '../entities/dispute-audit-log.entity';

const mockRepo = () => ({ create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn() });

describe('DisputeVotingService', () => {
  let service: DisputeVotingService;
  let disputeRepo, voteRepo, auditRepo;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputeVotingService,
        { provide: getRepositoryToken(Dispute), useFactory: mockRepo },
        { provide: getRepositoryToken(DisputeVote), useFactory: mockRepo },
        { provide: getRepositoryToken(DisputeAuditLog), useFactory: mockRepo },
      ],
    }).compile();
    service = module.get<DisputeVotingService>(DisputeVotingService);
    disputeRepo = module.get(getRepositoryToken(Dispute));
    voteRepo = module.get(getRepositoryToken(DisputeVote));
    auditRepo = module.get(getRepositoryToken(DisputeAuditLog));
  });

  it('should not allow duplicate votes', async () => {
    disputeRepo.findOne.mockResolvedValue({
      id: 'd1',
      status: 'pending',
      votes: [{ voter: { id: 'u1' } }],
    });
    await expect(service.castVote('d1', { id: 'u1', role: 'admin' } as any, { decision: 'refund' })).rejects.toThrow();
  });

  it('should resolve dispute if quorum and majority are met', async () => {
    disputeRepo.findOne.mockResolvedValue({
      id: 'd1',
      status: 'pending',
      votes: [],
    });
    voteRepo.find.mockResolvedValue([
      { decision: 'refund' },
      { decision: 'refund' },
      { decision: 'reject' },
    ]);
    voteRepo.create.mockReturnValue({});
    voteRepo.save.mockResolvedValue({});
    auditRepo.create.mockReturnValue({});
    auditRepo.save.mockResolvedValue({});
    disputeRepo.save.mockResolvedValue({});
    await service.castVote('d1', { id: 'u2', role: 'admin' } as any, { decision: 'refund' });
    expect(disputeRepo.save).toHaveBeenCalled();
  });
});
