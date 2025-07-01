import { Test, TestingModule } from '@nestjs/testing';
import { ReputationService } from './reputation.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Feedback } from '../entities/feedback.entity';
import { SessionEventsService } from './session-events.service';

const mockUserRepo = () => ({ update: jest.fn() });
const mockFeedbackRepo = () => ({ find: jest.fn() });

describe('ReputationService', () => {
  let service: ReputationService;
  let userRepo;
  let feedbackRepo;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReputationService,
        { provide: getRepositoryToken(User), useFactory: mockUserRepo },
        { provide: getRepositoryToken(Feedback), useFactory: mockFeedbackRepo },
      ],
    }).compile();
    service = module.get<ReputationService>(ReputationService);
    userRepo = module.get(getRepositoryToken(User));
    feedbackRepo = module.get(getRepositoryToken(Feedback));
  });

  it('calculates score correctly', async () => {
    feedbackRepo.find.mockResolvedValue([
      { rating: 5, qualityScore: 2 },
      { rating: 4, qualityScore: 3 },
    ]);
    await service.updateMentorReputation('mentor-1');
    // (2 sessions * 2) + (4.5 avg rating * 10) + (2.5 avg quality * 5) = 4 + 45 + 12.5 = 61.5
    expect(userRepo.update).toHaveBeenCalledWith('mentor-1', { reputationScore: 61.5 });
  });

  it('handles no feedback', async () => {
    feedbackRepo.find.mockResolvedValue([]);
    await service.updateMentorReputation('mentor-2');
    expect(userRepo.update).toHaveBeenCalledWith('mentor-2', { reputationScore: 0 });
  });
});

describe('SessionEventsService', () => {
  let sessionEvents: SessionEventsService;
  let reputationService: ReputationService;

  beforeEach(() => {
    reputationService = { updateMentorReputation: jest.fn() } as any;
    sessionEvents = new SessionEventsService(reputationService);
  });

  it('triggers reputation update on session completion', async () => {
    await sessionEvents.onSessionCompleted('mentor-3');
    expect(reputationService.updateMentorReputation).toHaveBeenCalledWith('mentor-3');
  });
});
